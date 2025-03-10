# Serverless API

This is a serverless API for managing movie reviews, built using AWS CDK and deployed on AWS.

## 🚀 Features
- **Get reviews for a movie** (`GET /movies/reviews/{movieId}`)
- **Add a new review** (`POST /movies/reviews`)
- **Update a review** (`PUT /movies/{movieId}/reviews/{reviewId}`)
- **Translate a review** (`GET /reviews/{reviewId}/{movieId}/translation?language=code`)
- **Authentication using AWS Cognito**

## 🛠️ Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/ZhanLuo2024/serverlessAPI.git
   
2. **Install dependencies**:
    ```bash
   npm install
   
3. **Deployment**:
    ```bash
   cdk deploy

## TODO:
- Setup API Gateway
- Implement GET /movies/reviews/{movieId}
- Implement POST /movies/reviews (authentication required)
- Implement PUT /movies/{movieId}/reviews/{reviewId}
- Implement Amazon Translate integration
- Improve security and performance