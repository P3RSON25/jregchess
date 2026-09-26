"""Multitask trainer (round 3): shared trunk + value/policy heads, v1-loader export.

Labels per position (see scripts/bot-farm-worker.js teacher fields):
  value: MSE(result_w) + 0.5*margin-hinge using teacher-score sign where
    |score|>200 (teacher cp is side-to-move; value is white-centric, so flip
    by turn — getting this wrong anti-calibrates Black, check per-color AUC).
  policy: cross-entropy on TEACHER move destinations (192-way), not played
    moves (played moves may be jittered/blundered; teacher is deep search).

Exports reuse the v1 loader contracts (shared/valueNet.js,
shared/policyNet.js): trunk 2890->128->64 plus head, 3 layers each, with
trunk weights duplicated into both files (~391k unique params).

Usage:
  python ml/train_multitask.py --data data/teacher.jsonl --out-value ml/value_v3.json --out-policy ml/policy_v3.json
"""
import argparse
import json

import train_value as tv

BOARD_OFF = {"Normal": 0, "Heaven": 64, "Hell": 128}
OUT_P = 192
MARGIN = 0.5
CP_TH = 200


def load(path, max_rows=0):
    import numpy as np
    X, Y, T, P = [], [], [], []
    with open(path) as f:
        for ln in f:
            ln = ln.strip()
            if not ln:
                continue
            o = json.loads(ln)
            X.append(tv.expand_row(o))
            Y.append(float(o["result_w"]))
            sc = (o.get("teacher") or {}).get("score")
            w = 1.0 if o.get("turn") == "White" else -1.0
            # white-centric confident sign; 0 = unconfident/missing -> hinge masked
            if isinstance(sc, (int, float)) and abs(sc) > CP_TH:
                T.append((1.0 if sc > 0 else -1.0) * w)
            else:
                T.append(0.0)
            ta = (o.get("teacher") or {}).get("action") or {}
            if ta.get("action") == "move":
                P.append(BOARD_OFF.get(ta.get("board"), 0) + ta["to"]["y"] * 8 + ta["to"]["x"])
            else:
                P.append(-1)
            if max_rows and len(X) >= max_rows:
                break
    return np.stack(X), np.array(Y, np.float32), np.array(T, np.float32), np.array(P, np.int64)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out-value", default="ml/value_v3.json")
    ap.add_argument("--out-policy", default="ml/policy_v3.json")
    ap.add_argument("--epochs", type=int, default=20)
    ap.add_argument("--batch", type=int, default=1024)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--policy-w", type=float, default=1.0)
    ap.add_argument("--val-frac", type=float, default=0.1)
    ap.add_argument("--max-rows", type=int, default=0)
    a = ap.parse_args()

    import torch
    import torch.nn as nn

    dev = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"device={dev}")
    X, y, t, p = load(a.data, a.max_rows)
    print(f"rows={len(X)} teach_move={(p >= 0).mean():.3f} teach_conf={(t != 0).mean():.3f}")
    X = torch.from_numpy(X).to(dev)
    y = torch.from_numpy(y).unsqueeze(1).to(dev)
    t = torch.from_numpy(t).unsqueeze(1).to(dev)
    p = torch.from_numpy(p).to(dev)

    trunk = nn.Sequential(nn.Linear(tv.INPUT_DIM, 128), nn.ReLU(), nn.Linear(128, 64), nn.ReLU())
    vhead = nn.Sequential(nn.Linear(64, 1), nn.Tanh())
    phead = nn.Linear(64, OUT_P)
    net = nn.ModuleDict({"trunk": trunk, "v": vhead, "p": phead}).to(dev)
    opt = torch.optim.Adam(net.parameters(), lr=a.lr)
    mse = nn.MSELoss()
    ce = nn.CrossEntropyLoss()
    n = len(X)
    nv = max(1, int(n * a.val_frac))
    perm = torch.randperm(n)
    vi = perm[:nv].to(dev)
    ti = perm[nv:].to(dev)
    ntr = len(ti)
    Xv, yv, tv_, pv = X[vi], y[vi], t[vi], p[vi]
    best = float("inf")
    bs = None

    def vloss(v, yy, tt):
        m = mse(v, yy)
        c = (tt != 0).float()
        if c.sum() == 0:
            return m, m, torch.zeros((), device=dev)
        h = (torch.clamp(MARGIN - v * tt, min=0) * c).sum() / c.sum()
        return m + 0.5 * h, m, h

    def ploss(lg, pp):
        m = pp >= 0
        if m.sum() == 0:
            return torch.zeros((), device=dev)
        return ce(lg[m], pp[m])

    for ep in range(a.epochs):
        net.train()
        pr = ti[torch.randperm(ntr)]
        tot = 0.0
        for i in range(0, ntr, a.batch):
            idx = pr[i:i + a.batch]
            opt.zero_grad()
            h = trunk(X[idx])
            v, lg = vhead(h), phead(h)
            vl, _, _ = vloss(v, y[idx], t[idx])
            loss = vl + a.policy_w * ploss(lg, p[idx])
            loss.backward()
            opt.step()
            tot += loss.item() * len(idx)
        net.eval()
        with torch.no_grad():
            h = trunk(Xv)
            v, lg = vhead(h), phead(h)
            vm, m0, h0 = vloss(v, yv, tv_)
            pl = ploss(lg, pv)
            val = vm.item() + a.policy_w * pl.item()
            m = pv >= 0
            acc = float("nan")
            top3 = float("nan")
            if m.sum() > 0:
                acc = (lg[m].argmax(1) == pv[m]).float().mean().item()
                top3 = (lg[m].topk(3, 1).indices == pv[m].unsqueeze(1)).any(1).float().mean().item()
        if val < best:
            best = val
            bs = {k: v_.cpu().clone() for k, v_ in net.state_dict().items()}
        print(f"ep{ep + 1} loss={tot / ntr:.4f} val={val:.4f} (mse={m0:.4f} hinge={h0:.4f} p={pl.item():.4f} top1={acc:.3f} top3={top3:.3f})", flush=True)
    net.load_state_dict({k: v_.to(dev) for k, v_ in bs.items()})
    print(f"restored best val={best:.4f}")

    tl = [trunk[0], trunk[2]]
    for path, head, extra in [(a.out_value, vhead[0], {}), (a.out_policy, phead, {"output_dim": OUT_P})]:
        layers = [{"w": m.weight.detach().cpu().tolist(), "b": m.bias.detach().cpu().tolist()} for m in (*tl, head)]
        with open(path, "w") as f:
            json.dump({"v": 1, "input_dim": tv.INPUT_DIM, **extra, "layers": layers}, f)
        print(f"saved {path}")


if __name__ == "__main__":
    main()
