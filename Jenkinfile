pipeline {
    agent any

    environment {
        DOCKER_HUB_USER = 'moazamyasin'
        REGISTRY_REPO   = 'moazamyasin/resize-studio'
        IMAGE_TAG       = 'latest'
        // Make sure this matches your Jenkins Credentials ID for Docker Hub
        DOCKER_CREDS_ID = '4c178f54-a872-445a-8553-296d96ee9ebb'
    }

    stages {
        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo 'Building application Docker container...'
                    sh "docker build -t ${REGISTRY_REPO}:${IMAGE_TAG} ."
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    echo 'Logging into Docker Hub and pushing image...'
                    withDockerRegistry(credentialsId: "${DOCKER_CREDS_ID}", url: "https://index.docker.io/v1/") {
                        sh "docker push ${REGISTRY_REPO}:${IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Deploy to K3s') {
            steps {
                script {
                    echo 'Applying manifests to K3s cluster...'
                    // Updates the deployment and forces a rollout refresh
                    sh "kubectl apply -f k8s/deployment.yaml"
                    sh "kubectl rollout restart deployment/resize-studio"
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully! Application deployed.'
        }
        failure {
            echo 'Pipeline failed. Please check build logs for details.'
        }
    }
}
