const fs = require('fs');
const { exec } = require('child_process');

const config = JSON.parse(fs.readFileSync('../config.json'));
const sokratesConfigPathAppender = '/_sokrates/config.json';
const sokratesJarFilePath = config.sokratesJarFilePath;
const PAT = config.PAT;
const gitBaseUrl = config.baseUrl;
const javaOptions = config.javaOptions;
const sokratesPortfolio = config.sokratesPortfolio
const sokratesLandscapes = config.landscapes

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

const sokratesExtractHistory = function (repoPath) {
    await execHelper('cd ' + repoPath + ' && java -jar ' + sokratesJarFilePath + ' extractGitHistory');
};

const sokratesInit = function (repoPath) {
    if (!fs.existsSync(repoPath + sokratesConfigPathAppender)) {
        await execHelper('cd ' + repoPath + ' && java -jar ' + sokratesJarFilePath + ' init');
    }
};

const sokratesGenerateReport = function (repoPath) {
    await execHelper('cd ' + repoPath + ' && java -jar ' + javaOptions + ' ' + sokratesJarFilePath + ' generateeports');
};


const sokratesUpdateLandscape = function (landscape) {
    await execHelper('cd ' + sokratesPortfolio + '/' + landscape + ' && java -jar ' + sokratesJarFilePath + ' updateLandscape')
};

const optimizeForLandscape = function (repoPath, landscape) {
    //clean based on Zljelkos size optimizatin
    //clean files
};

const getSourceCode = function (repo, landscape) {
    let repoPath = sokratesPortfolio + '/' + landscape + '/' + repo.split('/')[-1]
    if (!fs.existsSync(sokratesPortfolio + '/' + landscape)) {
        fs.mkdirSync(sokratesPortfolio + '/' + landscape);
    }

    if (!fs.existsSync(repoPath)) {
        let repository = 'https://' + PAT + '@' + gitBaseUrl + repo;
        await execHelper('cd ' + sokratesPortfolio + '/' + landscape + ' && git clone ' + repository);
    } else {
        await execHelper('cd ' + repoPath + ' && git pull');
    }
};

const updatePortfolio = function () {
    for (landscape in sokratesLandscapes) {
        for (repository in landscape.repositories) {
            let repoPath = sokratesPortfolio + '/' + landscape + '/' + repo.split('/')[-1]
            getSourceCode(repository, landscape.name);
            await sokratesExtractHistory(repoPath);
            await sokratesInit(repoPath);
            await sokratesGenerateReport(repoPath);
            sokratesUpdateLandscape(landscape.name)
        }
    }
}


updatePortfolio();