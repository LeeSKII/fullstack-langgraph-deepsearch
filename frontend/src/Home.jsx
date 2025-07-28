// Home.jsx or your main component file
import React from 'react';

const Home = () => {
  return (
    <div className="bg-[var(--background-white-main)] dark min-h-screen flex flex-col">
      {/* Header / Top Bar */}
      <header className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo or Home Name Placeholder */}
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {/* <img src="/logo.svg" alt="Logo" className="h-6 w-6" /> */}
          </div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Your Home Name</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Icon */}
          <button className="p-2 rounded-full hover:bg-[var(--fill-tsp-gray-main)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--icon-primary)]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </button>
          {/* User Profile Icon */}
          <div className="relative">
            <button className="flex items-center justify-center rounded-full overflow-hidden w-8 h-8">
              <div className="bg-gray-300 dark:bg-gray-600 border border-[var(--border-main)] rounded-full w-full h-full flex items-center justify-center">
                <span className="text-xs font-medium text-[var(--text-primary)]">U</span>
              </div>
            </button>
            {/* Dropdown menu would go here if needed */}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[var(--border-main)] bg-[var(--background-card-gray)] flex flex-col">
          <div className="p-4">
            <button className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-[var(--border-main)] text-[var(--text-primary)] hover:bg-[var(--fill-tsp-white-light)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">新建任务</span>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {/* Example Navigation Items */}
              <li>
                <a href="#" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--fill-tsp-gray-main)] text-[var(--text-primary)]">
                  <div className="bg-gray-200 dark:bg-gray-700 border border-[var(--border-main)] rounded w-4 h-4 flex-shrink-0"></div>
                  <span className="text-sm truncate">React Chat Home...</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--fill-tsp-gray-main)] text-[var(--text-primary)]">
                  <div className="bg-gray-200 dark:bg-gray-700 border border-[var(--border-main)] rounded w-4 h-4 flex-shrink-0"></div>
                  <span className="text-sm truncate">清洁车相遇问题...</span>
                </a>
              </li>
              {/* More items... */}
            </ul>
          </nav>
          <div className="p-3 border-t border-[var(--border-main)]">
            <div className="flex gap-1">
              <button className="px-3 py-1.5 rounded-full text-xs bg-[var(--tab-active-black)] text-[var(--text-onblack)] font-medium">推荐</button>
              <button className="px-3 py-1.5 rounded-full text-xs text-[var(--text-tertiary)] hover:bg-[var(--fill-tsp-white-main)]">编程</button>
              {/* More tabs... */}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header / Context Info */}
          <div className="p-4 border-b border-[var(--border-main)]">
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-full flex items-center justify-center relative bg-[var(--fill-tsp-white-dark)]">
                  <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded-sm"></div> {/* Icon Placeholder */}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 overflow-x-hidden">
                  <span className="truncate text-sm font-medium text-[var(--text-primary)] flex-1 min-w-0">
                    React Chat Home with FastAPI and LangGraph Integration
                  </span>
                  <span className="text-[var(--text-tertiary)] text-xs whitespace-nowrap">7/20</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 bg-[var(--background-white-main)] dark:bg-gray-900">
            {/* Example Message */}
            <div className="mb-4 flex justify-start">
              <div className="max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 bg-[var(--fill-tsp-white-dark)] text-[var(--text-primary)]">
                <p className="text-sm">我已经完成了第6阶段的核心任务，成功集成了认证、聊天界面和LangGraph状态显示功能...</p> {/* Truncated message content */}
              </div>
            </div>
            {/* More messages would go here */}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-[var(--border-main)] bg-[var(--background-white-main)]">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  className="w-full p-3 rounded-xl border border-[var(--border-main)] bg-[var(--background-white-main)] text-[var(--text-primary)] placeholder:text-[var(--text-disable)] text-sm shadow-none resize-none min-h-[40px]"
                  rows="1"
                  placeholder="分配一个任务或提问任何问题"
                ></textarea>
              </div>
              <button className="flex-shrink-0 p-2 rounded-full border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--fill-tsp-gray-main)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button className="flex-shrink-0 p-2 rounded-full border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--fill-tsp-gray-main)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <button className="flex-shrink-0 p-2 rounded-full bg-[var(--Button-primary-black)] text-[var(--text-onblack)] hover:opacity-90">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;