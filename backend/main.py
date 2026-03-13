from fastapi import FastAPI

app = FastAPI(
    title="Indoor Plant Assistant API",
    description="Backend for thesis project: Plant management and AI diagnosis.",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {"status": "success", "message": "FastAPI is running inside Docker!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}