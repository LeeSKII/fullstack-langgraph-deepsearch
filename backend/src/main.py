from fastapi import FastAPI

from .routers import search
from .utils import logger
import logging

app = FastAPI()

app.include_router(search.router,prefix="/llm/deep/search")

@app.get("/")
def read_root():
    logging.info("Root endpoint accessed")
    return {"Hello": "Deep Searcher"}

