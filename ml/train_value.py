"""Value-net v1 trainer for Jreg Chess (RTX 4070S machine).

Reads compact JSONL from `npm run bot:selfplay` (see shared/features.js)
and trains a small MLP: 2890 inputs -> 256 -> 128 -> 1 (tanh, white-centric).

Feature expansion (MUST match shared/valueNet.js):
  per square (192 squares: Normal 64 + Heaven 64 + Hell 64, row-major):
    - group one-hot (12): King, SuperKing, QueenFam, RookFam, BishopFam,
      KnightFam, PawnFam, Wild, Trap, Collectible, Portal, HeavenNPC
    - side (3): own relative to side-to-move? NO — white-centric: white, black, npc
  + 10 globals from the JSONL.
  Total: 192*15 + 10 = 2890.

Usage:
  pip install torch numpy
  python ml/train_value.py --data data/v1.jsonl --out ml/value_v1.json --epochs 20 --batch 1024
"""
import argparse
import json

TYPE_GROUP = {}  # typeId -> group index 0..11
# typeIds from shared/features.js TYPE_IDS
_KING = {6}
_SUPERKING = {14}
_QUEEN = {5, 15, 16}
_ROOK = {4, 17, 18, 10}
_BISHOP = {3, 13, 11, 12, 20}
_KNIGHT = {2, 8, 7, 21, 22, 9}
_PAWN = {1, 19}
_WILD = {46, 45, 44, 47}
_TRAP = {33, 34, 35, 36, 37}
_COLL = {30, 31}
_PORTAL = {32}
_NPC = {38, 39, 40, 41, 42, 43, 48}
for t in _KING: TYPE_GROUP[t] = 0
for t in _SUPERKING: TYPE_GROUP[t] = 1
for t in _QUEEN: TYPE_GROUP[t] = 2
for t in _ROOK: TYPE_GROUP[t] = 3
for t in _BISHOP: TYPE_GROUP[t] = 4
for t in _KNIGHT: TYPE_GROUP[t] = 5
for t in _PAWN: TYPE_GROUP[t] = 6
for t in _WILD: TYPE_GROUP[t] = 7
for t in _TRAP: TYPE_GROUP[t] = 8
for t in _COLL: TYPE_GROUP[t] = 9
for t in _PORTAL: TYPE_GROUP[t] = 10
for t in _NPC: TYPE_GROUP[t] = 11

N_SQUARES = 192
FEATS_PER_SQ = 15
N_GLOBALS = 10
INPUT_DIM = N_SQUARES * FEATS_PER_SQ + N_GLOBALS  # 2890


def expand_row(obj):
    import numpy as np
    x = np.zeros(INPUT_DIM, dtype=np.float32)
    off = 0
    for board in ("Normal", "Heaven", "Hell"):
        codes = obj["boards"][board]
        if codes is None:
            off += 64 * FEATS_PER_SQ
            continue
        for code in codes:
            if code != ".":
                c, t = code.split(":")
                c, t = int(c), int(t)
                g = TYPE_GROUP.get(t, 11)
                x[off + g] = 1.0
                # white-centric side channels: [white, black, npc]
                x[off + 12 + c] = 1.0
            off += FEATS_PER_SQ
    x[off:off + N_GLOBALS] = np.array(obj["globals"], dtype=np.float32)
    return x


def load(path, max_rows=0):
    import numpy as np
    xs, ys = [], []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            o = json.loads(line)
            xs.append(expand_row(o))
            ys.append(float(o["result_w"]))
            if max_rows and len(xs) >= max_rows:
                break
    return np.stack(xs), np.array(ys, dtype=np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", default="ml/value_v1.json")
    ap.add_argument("--epochs", type=int, default=20)
    ap.add_argument("--batch", type=int, default=1024)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--max-rows", type=int, default=0)
    ap.add_argument("--val-frac", type=float, default=0.1)
    a = ap.parse_args()

    import torch
    import torch.nn as nn

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"device={device}")
    X, y = load(a.data, a.max_rows)
    print(f"rows={len(X)} input_dim={X.shape[1]} pos_rate={(y > 0).mean():.3f}")
    X = torch.from_numpy(X).to(device)
    y = torch.from_numpy(y).unsqueeze(1).to(device)

    net = nn.Sequential(
        nn.Linear(INPUT_DIM, 256), nn.ReLU(),
        nn.Linear(256, 128), nn.ReLU(),
        nn.Linear(128, 1), nn.Tanh(),
    ).to(device)
    opt = torch.optim.Adam(net.parameters(), lr=a.lr)
    loss_fn = nn.MSELoss()
    n = len(X)
    n_val = max(1, int(n * a.val_frac))
    perm_all = torch.randperm(n)
    val_idx = perm_all[:n_val].to(device)
    train_idx = perm_all[n_val:].to(device)
    n_train = len(train_idx)
    Xv, yv = X[val_idx], y[val_idx]
    best_val = float("inf")
    best_state = None
    for ep in range(a.epochs):
        perm = train_idx[torch.randperm(n_train)]
        tot = 0.0
        net.train()
        for i in range(0, n_train, a.batch):
            idx = perm[i:i + a.batch]
            opt.zero_grad()
            loss = loss_fn(net(X[idx]), y[idx])
            loss.backward()
            opt.step()
            tot += loss.item() * len(idx)
        net.eval()
        with torch.no_grad():
            val = loss_fn(net(Xv), yv).item()
        if val < best_val:
            best_val = val
            best_state = {k: v.cpu().clone() for k, v in net.state_dict().items()}
        print(f"epoch {ep + 1}/{a.epochs} train_mse={tot / n_train:.4f} val_mse={val:.4f}", flush=True)
    if best_state is not None:
        net.load_state_dict({k: v.to(device) for k, v in best_state.items()})
        print(f"restored best val_mse={best_val:.4f}")

    # Export to JSON for shared/valueNet.js
    layers = []
    for m in net:
        if isinstance(m, nn.Linear):
            layers.append({
                "w": m.weight.detach().cpu().tolist(),
                "b": m.bias.detach().cpu().tolist(),
            })
    with open(a.out, "w") as f:
        json.dump({"v": 1, "input_dim": INPUT_DIM, "layers": layers}, f)
    print(f"saved {a.out}")


if __name__ == "__main__":
    main()
