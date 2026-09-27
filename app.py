from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

from flask import Flask, jsonify, render_template, request


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data.json"
DATA_LOCK = Lock()

DEFAULT_STATE = {
    "tasks": [
        {"id": "daily", "title": "Ежедневные задания", "done": False, "tag": "daily"},
        {"id": "route", "title": "Проверить маршрут и расписание", "done": False, "tag": "planning"},
        {"id": "inventory", "title": "Проверить инвентарь и расходники", "done": False, "tag": "check"},
        {"id": "notes", "title": "Записать результаты сессии", "done": False, "tag": "notes"},
    ],
    "notes": "",
    "sessions": 0,
    "completed": 0,
}

app = Flask(__name__)


def load_state() -> dict:
    with DATA_LOCK:
        if not DATA_FILE.exists():
            return json.loads(json.dumps(DEFAULT_STATE))
        try:
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            return {**DEFAULT_STATE, **data}
        except (OSError, ValueError):
            return json.loads(json.dumps(DEFAULT_STATE))


def save_state(state: dict) -> None:
    with DATA_LOCK:
        DATA_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/state")
def get_state():
    return jsonify(load_state())


@app.post("/api/tasks/<task_id>/toggle")
def toggle_task(task_id: str):
    state = load_state()
    task = next((item for item in state["tasks"] if item["id"] == task_id), None)
    if task is None:
        return jsonify({"error": "Задача не найдена"}), 404
    task["done"] = not task["done"]
    state["completed"] = sum(item["done"] for item in state["tasks"])
    save_state(state)
    return jsonify(state)


@app.post("/api/tasks")
def add_task():
    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title", "")).strip()
    if not title:
        return jsonify({"error": "Введите название задачи"}), 400
    state = load_state()
    next_id = f"task-{len(state['tasks']) + 1}"
    state["tasks"].append({"id": next_id, "title": title, "done": False, "tag": "custom"})
    save_state(state)
    return jsonify(state), 201


@app.post("/api/notes")
def update_notes():
    payload = request.get_json(silent=True) or {}
    state = load_state()
    state["notes"] = str(payload.get("notes", ""))[:5000]
    save_state(state)
    return jsonify(state)


@app.post("/api/sessions")
def add_session():
    state = load_state()
    state["sessions"] += 1
    save_state(state)
    return jsonify(state)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
