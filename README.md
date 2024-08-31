# Chat Service API

This API supports user registration, authentication, 1-1 messaging, group chat, group creation, and group deletion. Below is the list of available endpoints, request structures, and sample responses.

## Support This Project

If you like this project and want to support its development, consider becoming a sponsor!

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-brightgreen)](https://github.com/sponsors/prakhardoneria)

Your support helps us continue to improve and maintain the project.

## Endpoints

### 1. `/signup` - User Registration

- **Method**: `POST`
- **Request**:
  ```json
  {
    "username": "johndoe",
    "email": "johndoe@example.com",
    "password": "securepassword"
  }
  ```
- **Response**:
  - **Success**:
    ```json
    {
      "message": "User registered successfully",
      "userId": "b2a40472-d8d1-4264-8d8f-b2fa4b2a4047"
    }
    ```
  - **Error** (User or email already exists):
    ```json
    {
      "error": "User or email already exists"
    }
    ```

### 2. `/login` - User Login

- **Method**: `POST`
- **Request**:
  ```json
  {
    "username": "johndoe",
    "email": "johndoe@example.com", 
    "password": "securepassword"
  }
  ```
  - Either `username` or `email` should be provided (not both required).

- **Response**:
  - **Success**:
    ```json
    {
      "message": "Login successful",
      "userId": "b2a40472-d8d1-4264-8d8f-b2fa4b2a4047"
    }
    ```
  - **Error** (Invalid credentials):
    ```json
    {
      "error": "Invalid username/email or password"
    }
    ```

### 3. `/send-message` - Send a Message

- **Method**: `POST`
- **Request** (For 1-1 Messaging):
  ```json
  {
    "userId": "b2a40472-d8d1-4264-8d8f-b2fa4b2a4047",
    "recipientUsername": "janedoe",
    "message": "Hello, Jane!"
  }
  ```
- **Request** (For Group Messaging):
  ```json
  {
    "userId": "b2a40472-d8d1-4264-8d8f-b2fa4b2a4047",
    "groupName": "team-alpha",
    "message": "Hello, team!"
  }
  ```
- **Response**:
  - **Success**:
    ```json
    {
      "message": "Message sent successfully"
    }
    ```
  - **Error** (Recipient not found):
    ```json
    {
      "error": "Recipient not found"
    }
    ```

### 4. `/messages` - Get Messages

- **Method**: `GET`
- **Request** (For 1-1 Messaging):
  - **URL**: `/messages?userId=b2a40472-d8d1-4264-8d8f-b2fa4b2a4047&recipientId=7264b2a4-d8d1-4264-8d8f-b2fa4b2a4048`

- **Request** (For Group Messaging):
  - **URL**: `/messages?groupName=team-alpha`

- **Response**:
  - **Success** (1-1 Messaging):
    ```json
    [
      {
        "from": "b2a40472-d8d1-4264-8d8f-b2fa4b2a4047",
        "to": "7264b2a4-d8d1-4264-8d8f-b2fa4b2a4048",
        "message": "Hello, Jane!",
        "timestamp": "2024-08-31T10:00:00.000Z"
      }
    ]
    ```
  - **Success** (Group Messaging):
    ```json
    [
      {
        "from": "b2a40472-d8d1-4264-8d8f-b2fa4b2a4047",
        "message": "Hello, team!",
        "timestamp": "2024-08-31T10:00:00.000Z"
      }
    ]
    ```
  - **Error** (Invalid query parameters):
    ```json
    {
      "error": "Invalid query parameters"
    }
    ```

### 5. `/create-group` - Create a Group

- **Method**: `POST`
- **Request**:
  ```json
  {
    "groupName": "team-alpha",
    "members": ["johndoe", "janedoe"]
  }
  ```
- **Response**:
  - **Success**:
    ```json
    {
      "message": "Group created successfully"
    }
    ```
  - **Error** (Group already exists):
    ```json
    {
      "error": "Group already exists"
    }
    ```

### 6. `/delete-group` - Delete a Group

- **Method**: `POST`
- **Request**:
  ```json
  {
    "groupName": "team-alpha"
  }
  ```
- **Response**:
  - **Success**:
    ```json
    {
      "message": "Group deleted successfully"
    }
    ```
  - **Error** (Group not found):
    ```json
    {
      "error": "Group not found"
    }
    ```

### 7. `/delete` - Delete All Accounts or Messages

- **Method**: `GET`
- **Request** (For deleting all accounts):
  - **URL**: `/delete?type=accounts`
- **Request** (For deleting all messages):
  - **URL**: `/delete?type=msgs`

- **Response**:
  - **Success** (Accounts):
    ```json
    {
      "message": "All accounts deleted successfully"
    }
    ```
  - **Success** (Messages):
    ```json
    {
      "message": "All messages deleted successfully"
    }
    ```
  - **Error** (Invalid type parameter):
    ```json
    {
      "error": "Invalid type parameter"
    }
    ```

### 8. `/remove` - Remove User and Related Data

- **Method**: `POST`
- **Request**:
  ```json
  {
    "username": "johndoe",
    "email": "johndoe@example.com",
    "password": "securepassword"
  }
  ```
  - Either `username` or `email` should be provided (not both required).

- **Response**:
  - **Success**:
    ```json
    {
      "message": "User and all related data removed successfully"
    }
    ```
  - **Error** (Invalid credentials):
    ```json
    {
      "error": "Invalid username/email or password"
    }
    ```

### 9. `/users-messaged` - Get Users Messaged

- **Method**: `GET`
- **Request**:
  - **URL**: `/users-messaged?username=johndoe`

- **Response**:
  - **Success**:
    ```json
    [
      {
        "uid": "7264b2a4-d8d1-4264-8d8f-b2fa4b2a4048",
        "lastMessage": "Hello, Jane!",
        "timestamp": "2024-08-31T10:00:00.000Z"
      }
    ]
    ```
  - **Error** (User not found):
    ```json
    {
      "error": "User not found"
    }
    ```

## Running the Server

1. Ensure you have [Deno](https://deno.land/) installed.
2. Run the server:
   ```sh
   deno run --allow-net --allow-env --allow-read --allow-write your-script-file.ts
   ```
3. The server will start listening on port `8000`.

## Notes

- **Error Handling**: Most endpoints provide error responses with descriptive messages to guide the client.
- **Request Structure**: Ensure that the JSON body is correctly formatted, especially for required fields.
- **Message Limits**: The server retains the last 25 messages per user or group to avoid excessive storage usage.