const { MCPServer } = require('@modelcontextprotocol/server');
const express = require('express');

// Create a simple in-memory task store
const tasks = [
{ id: 1, title: 'Example Task 1', description: 'This is an example task', completed: false },
{ id: 2, title: 'Example Task 2', description: 'Another example task', completed: true },
];

// Helper function to generate a new task ID
function generateTaskId() {
return Math.max(0, ...tasks.map(task => task.id)) + 1;
}

// Create an MCP server
const server = new MCPServer({
name: 'Task Manager MCP',
description: 'MCP server for managing tasks',
version: '1.0.0',
});

// Register a tool to create a new task
server.registerTool({
name: 'create_task',
description: 'Create a new task in the task manager',
parameters: {
type: 'object',
properties: {
title: {
type: 'string',
description: 'The title of the task',
},
description: {
type: 'string',
description: 'The description of the task',
},
},
required: ['title'],
},
handler: async (params) => {
const newTask = {
id: generateTaskId(),
title: params.title,
description: params.description || '',
completed: false,
};

    tasks.push(newTask);

    return {
      success: true,
      task: newTask,
    };
},
});

// Register a tool to list all tasks
server.registerTool({
name: 'list_tasks',
description: 'List all tasks in the task manager',
parameters: {
type: 'object',
properties: {
filter: {
type: 'string',
description: 'Filter tasks by status: "all", "completed", or "incomplete"',
enum: ['all', 'completed', 'incomplete'],
},
},
},
handler: async (params) => {
const filter = params.filter || 'all';
let filteredTasks = tasks;

    if (filter === 'completed') {
      filteredTasks = tasks.filter(task => task.completed);
    } else if (filter === 'incomplete') {
      filteredTasks = tasks.filter(task => !task.completed);
    }

    return {
      success: true,
      tasks: filteredTasks,
    };
},
});

// Register a tool to complete a task
server.registerTool({
name: 'complete_task',
description: 'Mark a task as completed',
parameters: {
type: 'object',
properties: {
id: {
type: 'number',
description: 'The ID of the task to mark as completed',
},
},
required: ['id'],
},
handler: async (params) => {
const taskId = params.id;
const taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
      return {
        success: false,
        error: `Task with ID ${taskId} not found`,
      };
    }

    tasks[taskIndex].completed = true;

    return {
      success: true,
      task: tasks[taskIndex],
    };
},
});

// Register a tool to delete a task
server.registerTool({
name: 'delete_task',
description: 'Delete a task from the task manager',
parameters: {
type: 'object',
properties: {
id: {
type: 'number',
description: 'The ID of the task to delete',
},
},
required: ['id'],
},
handler: async (params) => {
const taskId = params.id;
const taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
      return {
        success: false,
        error: `Task with ID ${taskId} not found`,
      };
    }

    const deletedTask = tasks[taskIndex];
    tasks.splice(taskIndex, 1);

    return {
      success: true,
      task: deletedTask,
    };
},
});

// Start the server
const app = express();
const PORT = 3000;

server.applyMiddleware(app);

app.listen(PORT, () => {
console.log(`Task Manager MCP server running at http://localhost:${PORT}`);
});