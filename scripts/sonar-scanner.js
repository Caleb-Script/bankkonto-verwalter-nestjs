import dotenv from 'dotenv';
import process from 'node:process';
import { scan } from 'sonarqube-scanner';

// Umgebungsvariable aus .env einlesen
dotenv.config();
const sonarToken = process.env.SONAR_TOKEN;

scan(
    {
        serverUrl: 'http://localhost:9000',
        options: {
            'sonar.projectName': 'bankkonto',
            'sonar.projectKey': 'bankkonto',
            'sonar.projectDescription':
                'Appserver für das verwalten von bankkontos',
            'sonar.projectVersion': '2024.10.1',
            'sonar.sources': 'src',
            'sonar.tests': '__tests__',
            'sonar.token': sonarToken,
            'sonar.scm.disabled': 'true',
            'sonar.javascript.environments': 'node',
            'sonar.exclusions':
                'node_modules/**,.extras/**,.scannerwork/*,.vscode/*,coverage/**,dist/*,log/*',
            'sonar.javascript.lcov.reportPaths': './coverage/lcov.info',
        },
    },
    () => process.exit(),
);
