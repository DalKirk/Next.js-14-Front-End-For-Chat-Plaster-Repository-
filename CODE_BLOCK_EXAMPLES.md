# Code Block Examples for Testing

Copy and paste these examples directly into your chat to test syntax highlighting!

---

## HTML Example

```
Here's some HTML:
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Test Page</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <h1>Hello World</h1>
    <p class="intro">Welcome to my page!</p>
  </body>
</html>
```
```

---

## JavaScript Example

```
Here's a React component:
```javascript
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default Counter;
```
```

---

## Python Example

```
Here's a Python function:
```python
def fibonacci(n):
    """Generate fibonacci sequence up to n terms"""
    a, b = 0, 1
    result = []
    
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    
    return result

# Example usage
print(fibonacci(10))
```
```

---

## CSS Example

```
Some CSS styling:
```css
.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.button:hover {
  transform: scale(1.05);
}

.button:active {
  transform: scale(0.95);
}
```
```

---

## TypeScript Example

```
TypeScript interface:
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```
```

---

## SQL Example

```
Database query:
```sql
SELECT 
  users.id,
  users.username,
  COUNT(posts.id) as post_count,
  MAX(posts.created_at) as last_post
FROM users
LEFT JOIN posts ON users.id = posts.user_id
WHERE users.active = true
GROUP BY users.id, users.username
HAVING COUNT(posts.id) > 5
ORDER BY last_post DESC
LIMIT 10;
```
```

---

## JSON Example

```
Configuration file:
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "react": "^18.2.0",
    "next": "^14.0.0"
  }
}
```
```

---

## Bash Example

```
Shell script:
```bash
#!/bin/bash

# Deployment script
echo "Starting deployment..."

npm install
npm run build
pm2 restart app

echo "Deployment complete!"
```
```

---

## Multiple Code Blocks

```
You can even send multiple code blocks in one message:

First, the HTML:
```html
<div class="container">
  <h1>Title</h1>
</div>
```

Then the CSS:
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
}
```

And finally the JavaScript:
```javascript
document.querySelector('.container').addEventListener('click', () => {
  console.log('Container clicked!');
});
```
```

---

## Tips

- Always start with three backticks followed by the language name
- End with three backticks on a new line
- Supported languages: html, javascript, python, css, typescript, sql, json, bash, and many more!
- Use the copy button in the top-right of each code block
- Click "View Source" to see the raw markdown
- Click the copy icon next to the timestamp to copy the entire message
