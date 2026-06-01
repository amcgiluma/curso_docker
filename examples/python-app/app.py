from fastapi import FastAPI

app = FastAPI(title="python-app", version="1.0.0")


@app.get("/")
def root():
    return {"mensaje": "hola docker"}


@app.get("/health")
def health():
    return {"status": "ok"}
