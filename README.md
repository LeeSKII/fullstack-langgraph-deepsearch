# Fullstack LangGraph Deep search Quickstart

This project demonstrates a fullstack application using a React frontend and a LangGraph Fastapi powered backend agent.

And you will find a lot of similarities with google deep search and jd agent, because they are both give this project spirit.

## Development Notices

1. Don't use `BaseMessages` or other langchain messages class in return state, because they will trigger unnecessary messages event to the frontend. BTW, they also include a lot of unnecessary meta data, the best practice is to use a simple dictionary to store the data, and it compatible with the openai api used format

2. When use `Command` or `conditional_edge`:

   - `Command` use to goto a node and need to update state at the same time
   - `conditional_edge` use the state to decide which node to goto, and it doesn't need to update state at the same time.

## TODO:

### Backend

1. 增加秘塔搜索 API 接口
2. 增加 serper 搜索接口

待定：使用https://r.jina.ai/读取网页内容进行详细了解
