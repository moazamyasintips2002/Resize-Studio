pipeline {
    agent any

    environment {
        DOCKER_HUB_USER = 'moazamyasin'
        REGISTRY_REPO   = 'moazamyasin/resize-studio'
        IMAGE_TAG       = 'latest'
        // Make sure this matches your Jenkins Credentials ID for Docker Hub
        DOCKER_CREDS_ID = 'ae697d34-d8f2-48b5-9578-3bca0831a9c7'
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
