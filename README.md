# Serverless API

This is a serverless API for managing movie reviews, built using AWS CDK and deployed on AWS.

## Table of Content
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [API Endpoints](#api-endpoints)
4. [Authentication & Authorization](#authentication--authorization)
5. [Database Schema](#database-schema)
6. [Technology Stack](#technology-stack)
7. [Deployment Guide](#deployment-guide)
8. [API Testing](#api-testing)
9. [Completed Features](#completed-features)
10. [Next steps](#next-setps)
---

## Project Overview
This project is **serverless API** that let user **create, update and view movie reviews**.  
It also **support translation** using **Amazon Translate**, so review can be read in different languages.

**Main Features**:
- **CRUD operations for movie reviews**
- **User authentication by Cognito**
- **Support multi-language translation**
- **DynamoDB as a NoSQL database**
- **API Gateway Validation for secure input**
- **Fully Serverless using AWS CDK**

---

## System Architecture
The API is **fully serverless**, which means **no server to maintain**, everything runs on AWS.

1. **API Gateway**: All request goes here first.
2. **Cognito**: Handle user sign up and login.
3. **Lambda Functions**:
   - Handle **create, update, get** movie review.
   - Call **Amazon Translate** for language support.
4. **DynamoDB**: Save movie reviews and translation cache.
5. **Amazon Translate**: Provide translation service.
6. **API Gateway Validation**: Reject invalid request before Lambda run.

** Architecture Diagram **
![Architecture Diagram](docs/Architecture.png)

---

## API Endpoints
| Method | Endpoint | Description | Authentication |
|--------|---------|------------|---------------|
| **GET** | `/movies/reviews/{movieId}` | Get reviews for movie | ❌ No need |
| **POST** | `/movies/reviews` | Add new review | ✅ Need login |
| **PUT** | `/movies/{movieId}/reviews/{reviewId}` | Edit review | ✅ Need login (Only owner) |
| **GET** | `/reviews/{reviewId}/{movieId}/translation?language=code` | Translate review | ❌ No need |
| **POST** | `/auth/signup` | User sign up | ❌ No need |
| **POST** | `/auth/signin` | User login, get token | ❌ No need |
| **POST** | `/auth/signout` | User logout | ✅ Need login |

---

## Database Schema

| Attribute | Type | Notes |
|-----------|------|-------|
| **MovieId** | `String` (PK) | Unique movie ID |
| **ReviewId** | `String` (SK) | Auto-generated review ID |
| **ReviewerId** | `String` | Cognito User ID |
| **ReviewDate** | `String` (ISO 8601) | When review created |
| **Content** | `String` | Review text |
| **TargetLanguage** | `String` (GSI) | Used for translation |

**Note:** The requirement say **MovieId & ReviewId should be Number**, but we use **String** to better support API.

---

## Authentication & Authorization
**Cognito User Pool**
- User **must sign up with email and password**
- Only **authenticated user can post and update reviews**

**Authorization Rules**
- **Only the reviewer** can **update their own review**
- **API Gateway validation check** before request go to Lambda

---

## Technology Stack
- **AWS CDK** (TypeScript) - Infrastructure as Code
- **Amazon API Gateway** - Handle API request
- **AWS Lambda** - Function execution
- **Amazon DynamoDB** - NoSQL storage for reviews
- **Amazon Cognito** - User authentication
- **Amazon Translate** - Machine translation
- **Postman** - API testing

---

## Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/ZhanLuo2024/serverlessAPI.git
   
2. **Install dependencies**:
    ```bash
   npm install -g aws-cdk
   npm install


3. **Deployment**:
    ```bash
   cdk deploy

##  Completed Features
- CRUD for movie reviews
- Cognito Authentication & Authorization
- DynamoDB with GSI for Translations
- API Gateway Request Validation
- Custom Construct for Lambda Management

## Next steps
- Better Error Handing
- More log using CloudWatch