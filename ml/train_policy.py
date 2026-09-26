"""Policy-net v1: destination prior via behavior cloning on hard-vs-hard moves.

Predicts WHERE hard moves: 192-way classification over
  Normal y*8+x (0-63), Heaven (64-127), Hell (128-191).
Only positions whose recorded action is a "move" are used (~92% of data).
Buys/upgrades/decisions keep heuristic handling; the prior is used for move
ordering + top-N pruning in shared/policyNet.js (MUST match its indexing).

Usage:
  python ml/train_policy.py --data data/policy.jsonl --out ml/policy_v1.json --epochs 30
"""
import argparse
import json

# Import feature expansion from the value trainer (same 2890-dim contract).
import train_value as tv

BOARD_OFF = {"Normal": 0, "Heaven": 64, "Hell": 128}
OUTPUT_DIM = 192


def load_moves(path, max_rows=0):
    import numpy as np
    xs, ys = [], []
    skipped = 0
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            o = json.loads(line)
            a = o.get("action") or {}
            if a.get("action") != "move":
                skipped += 1
                continue
            to = a.get("to", {})
            idx = BOARD_OFF.get(a.get("board"), 0) + to.get("y", 0) * 8 + to.get("x", 0)
            xs.append(tv.expand_row(o))
            ys.append(idx)
            if max_rows and len(xs) >= max_rows:
                break
    return np.stack(xs), np.array(ys, dtype="int64"), skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", default="ml/policy_v1.json")
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--batch", type=int, default=1024)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--val-frac", type=float, default=0.1)
    ap.add_argument("--max-rows", type=int, default=0)
    a = ap.parse_args()

    import torch
    import torch.nn as nn

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"device={device}")
    X, y, skipped = load_moves(a.data, a.max_rows)
    print(f"move_rows={len(X)} skipped_nonmove={skipped} classes=192")
    X = torch.from_numpy(X).to(device)
    y = torch.from_numpy(y).to(device)

    net = nn.Sequential(
        nn.Linear(tv.INPUT_DIM, 256), nn.ReLU(),
        nn.Linear(256, 128), nn.ReLU(),
        nn.Linear(128, OUTPUT_DIM),
    ).to(device)
    opt = torch.optim.Adam(net.parameters(), lr=a.lr)
    loss_fn = nn.CrossEntropyLoss()
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
        tot, correct, total = 0.0, 0, 0
        net.train()
        for i in range(0, n_train, a.batch):
            idx = perm[i:i + a.batch]
            opt.zero_grad()
            out = net(X[idx])
            loss = loss_fn(out, y[idx])
            loss.backward()
            opt.step()
            tot += loss.item() * len(idx)
            correct += (out.argmax(1) == y[idx]).sum().item()
            total += len(idx)
        net.eval()
        with torch.no_grad():
            outv = net(Xv)
            val = loss_fn(outv, yv).item()
            vacc = (outv.argmax(1) == yv).float().mean().item()
        if val < best_val:
            best_val = val
            best_state = {k: v.cpu().clone() for k, v in net.state_dict().items()}
        print(f"epoch {ep + 1}/{a.epochs} loss={tot / n_train:.4f} acc={correct / total:.3f} val_loss={val:.4f} val_acc={vacc:.3f}", flush=True)
    if best_state is not None:
        net.load_state_dict({k: v.to(device) for k, v in best_state.items()})
        print(f"restored best val_loss={best_val:.4f}")

    layers = []
    for m in net:
        if isinstance(m, nn.Linear):
            layers.append({"w": m.weight.detach().cpu().tolist(), "b": m.bias.detach().cpu().tolist()})
    with open(a.out, "w") as f:
        json.dump({"v": 1, "input_dim": tv.INPUT_DIM, "output_dim": OUTPUT_DIM, "layers": layers}, f)
    print(f"saved {a.out}")


if __name__ == "__main__":
    main()
