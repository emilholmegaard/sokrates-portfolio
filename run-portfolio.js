const fs = require('fs');
const { execSync, exec } = require('child_process');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const sokratesConfigPathAppender = '/_sokrates/config.json';
const sokratesJarFilePath = config.sokratesJarFilePath;
const PAT = config.Base64PAT;
const gitBaseUrl = config.baseUrl;
const gitUser = config.defaultUser;
const javaOptions = config.javaOptions;
const sokratesPortfolio = config.sokratesPortfolio;
const sokratesAnalysis = config.sokratesAnalysisLocation;
const sokratesLandscapes = config.landscapes;

const ignoreFolders = config.ignoreFoldersForHistory;
const ignoreFiles = config.ignoreFilesForHistory;

const execHelper = function (command) {
    child = exec(command,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
                return false;
            }
        });

    child.on('exit', function (code, signal) {
        console.log('child process exited with ' +
            `code ${code} and signal ${signal}`);
    });
    return true;
};

const execSyncHelper = function (command) {
    child = execSync(command);

    return true;

};
const sokratesExtractHistory = function (repoPath) {
    execHelper('cd ' + repoPath + ' && java -jar ' + sokratesJarFilePath + ' extractGitHistory');
};

const sokratesInit = function (repoPath) {
    if (!fs.existsSync(repoPath + sokratesConfigPathAppender)) {
        execSyncHelper('cd ' + repoPath + ' && java -jar ' + sokratesJarFilePath + ' init');
    }
};

const sokratesGenerateReport = function (repoPath) {
    execHelper('cd ' + repoPath + ' && java -jar ' + javaOptions + ' ' + sokratesJarFilePath + ' generateeports');
};


const moveResultsToLandscape = function (analysisPath, landscapePath) {
    execSyncHelper('cp '+ analysisPath + '/_sokrates '+ landscapePath);
};

const sokratesUpdateLandscape = function (landscape) {
    execHelper('cd ' + sokratesPortfolio + '/' + landscape + ' && java -jar ' + sokratesJarFilePath + ' updateLandscape')
};

const cleanFolderIgnores = function (repoPath) {
    for (const folder of ignoreFolders) {
        execHelper('cd ' + repoPath + ' && find . -type d -name "' + folder + '" -exec rm -rf {} +');
    }
};
const cleanFileIgnores = function (repoPath) {
    for (const file of ignoreFiles) {
        execHelper('cd ' + repoPath + ' && find . -type f -name "' + file + '" -delete');
    }
};
const optimizeForLandscape = function (repoPath, landscape) {
    cleanFolderIgnores(repoPath);
    cleanFileIgnores(repoPath);
};

const getSourceCode = function (repo, landscape, analysisPath, landscapePath) {

    if (!fs.existsSync(sokratesPortfolio + '/' + landscape)) {
        fs.mkdirSync(sokratesPortfolio + '/' + landscape);
    }

    if (!fs.existsSync(analysisPath)) {
        let repository = 'https://'+ gitUser + '@' + gitBaseUrl + '/' + repo;
        let cloneCommand = 'git -c http.extraHeader="Authorization: Basic '+ PAT +'" clone ' + repository;
	console.log(cloneCommand);
	execSyncHelper('cd ' + sokratesAnalysis + ' && ' + cloneCommand);
    } else {
        execSyncHelper('cd ' + analysisPath + ' && git -c http.extraHeader="Authorization: Basic '+ PAT +'" pull');
    }
};

const updatePortfolio = function () {
    for (const landscape of sokratesLandscapes) {
        for (const repository of landscape.repositories) {
            let landscapePath = sokratesPortfolio + '/' + landscape.name + '/' + repository.split('/').pop();
            let analysisPath = sokratesAnalysis + '/' + repository.split('/').pop();
            console.log("lanscapePath: "+landscapePath);
	        console.log("analysisPath: "+analysisPath);
            getSourceCode(repository, landscape.name, analysisPath, landscapePath);
            sokratesExtractHistory(analysisPath);
            sokratesInit(analysisPath);
            optimizeForLandscape(analysisPath);
            sokratesGenerateReport(analysisPath);
     	    execSync('sleep 5000');
	        moveResultsToLandscape(analysisPath, landscapePath);
        }
	    sokratesUpdateLandscape(landscape.name);
        }
	sokratesUpdateLandscape("");
}


updatePortfolio();
