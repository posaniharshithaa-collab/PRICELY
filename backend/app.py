from flask import Flask, jsonify, request
from datetime import datetime, timezone

app = Flask(__name__)


@app.get("/")
def home():
    return jsonify({
        "service": "PRICELY Backend",
        "status": "online",
        "version": "1.1.0"
    })


@app.get("/health")
def health():
    return jsonify({
        "status": "healthy"
    })


@app.post("/analyze")
def analyze():
    data = request.get_json(silent=True) or {}

    current = float(data.get("currentPrice") or 0)
    mrp = float(data.get("mrp") or 0)
    launch_date = data.get("launchDate")

    if current <= 0:
        return jsonify({
            "ok": False,
            "error": "A valid current price is required."
        }), 400

    anchor = mrp if mrp > 0 else current * 1.18
    age_months = 6.0

    if launch_date:
        try:
            launched = datetime.fromisoformat(
                str(launch_date).replace("Z", "+00:00")
            )

            now = datetime.now(timezone.utc)

            if launched.tzinfo is None:
                launched = launched.replace(tzinfo=timezone.utc)

            age_months = max(
                1.0,
                (now - launched).total_seconds() / 2629800
            )

        except Exception:
            age_months = 6.0

    decay = min(
        0.24,
        max(0.05, age_months * 0.018)
    )

    typical = round(
        max(
            current * 1.02,
            anchor * (1 - decay) * 0.96
        )
    )

    lowest = round(
        max(
            current * 0.88,
            min(
                current * 0.98,
                typical * 0.90
            )
        )
    )

    highest = round(
        max(
            anchor,
            typical * 1.08
        )
    )

    confidence = "medium" if (mrp or launch_date) else "low"

    return jsonify({
        "ok": True,
        "type": "estimated",
        "typical": typical,
        "lowest": lowest,
        "highest": highest,
        "confidence": confidence,
        "method": "MRP/launch anchor + product age + current price + conservative reference model"
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=10000
    )