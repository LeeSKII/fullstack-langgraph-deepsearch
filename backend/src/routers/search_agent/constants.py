"""
常量定义模块

该模块包含应用程序中使用的所有常量定义，包括模型名称、系统提示词等。
"""

import os

# 环境变量名称常量
QWEN_API_KEY = "QWEN_API_KEY"
QWEN_API_BASE_URL = "QWEN_API_BASE_URL"
SEARCH_MODEL_NAME = "SEARCH_MODEL_NAME"
TAVILY_API_KEY = "TAVILY_API_KEY"

# 默认模型名称

# 错误消息常量
ERROR_QUERY_EMPTY = "Query cannot be empty"
ERROR_MESSAGES_NOT_LIST = "Messages must be a list"
ERROR_QWEN_API_KEY_MISSING = "QWEN_API_KEY 环境变量未设置"
ERROR_QWEN_API_BASE_URL_MISSING = "QWEN_API_BASE_URL 环境变量未设置"
ERROR_TAVILY_API_KEY_MISSING = "TAVILY_API_KEY 环境变量未设置"

# 提示词常量
ANALYZE_NEED_WEB_SEARCH_PROMPT = "根据用户提出的问题:\n{query}\n。如果存在上下文信息，并且你能综合上下文信息，判断有足够的信息做出回答，如果不存在上下文信息，但是如果你判断这是一个你可以优先根据内化知识进行回答的问题，那么也不需要执行网络搜索，isNeedWebSearch为False。如果既无法根据内化知识回答，也不能从上下文历史消息中获取足够的信息，那么就需要使用网络搜索，isNeedWebSearch为True。请使用json结构化输出，严格遵循json格式：\n{format_instructions}"
GENERATE_SEARCH_QUERY_PROMPT = "根据用户的问题：\n{query},以及上下文的messages生成一个合适的网络搜索查询。使用json结构化输出，严格遵循的schema：\n{format_instructions}"
EVALUATE_SEARCH_RESULTS_PROMPT = "根据用户的问题：\n{query},AI模型进行了关于：{web_search_query} 的相关搜索,这里包含了曾经的历史搜索关键字：{web_search_query_list},这些历史关键字搜索到以下内容：{current_search_results}。现在需要你严格评估这些搜索结果是否可以帮助你做出回答，从而满足用户的需求，如果判断当前信息不足，即is_sufficient为false，那么必须要生成followup_search_query，注意生成的followup_search_query必须与历史搜索记录体现差异性，严禁使用同质化搜索关键字，这将导致搜索结果重复，造成严重的信息冗余后果。要求使用json结构化输出，严格遵循的schema：\n{format_instructions}"
DEFAULT_SEARCH_MODEL_NAME = "qwen-plus-latest"

# 最大搜索循环次数
MAX_SEARCH_LOOP = 3

# 系统提示词
SYSTEM_PROMPT_TEMPLATE = "You are a helpful robot,current time is:{current_time},no_think."

# 简单的系统提示，用于普通对话
SIMPLE_SYSTEM_PROMPT = SYSTEM_PROMPT_TEMPLATE.format(current_time="{current_time}")