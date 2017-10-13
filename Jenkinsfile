#!groovy

pipeline {
  agent {
    node { label 'ecs-builder' }
  }

  stages {
    stage('prepare') {
      steps {
        buildNpmrc()
      }
    }

    stage('unit tests') {
      steps {
        withCredentials([
          string(credentialsId: 'SNYK_AUTH_TOKEN', variable: 'SNYK_TOKEN')
        ]) {
          sh 'yarn install'
          sh 'yarn test'
        }
      }
    }

    stage('deploy') {
      when { branch 'master' }
      steps {
        sh 'npm run deploy'
      }
    }
  }
}
