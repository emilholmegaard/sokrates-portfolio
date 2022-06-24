const fs = require('fs');
const { execSync, exec, spawn } = require('child_process');

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
        if (code > 0) {
            console.log('child process exited with ' +
                `code ${code} and signal ${signal}`);
        }
    });
    return true;
};

async function spawnHelper(instruction, arguments, spawnOpts = {}, silenceOutput = false) {

    return new Promise((resolve, reject) => {
        setTimeout(() => {


            let errorData = "";

            if (process.env.DEBUG_COMMANDS === "true") {
                console.log(`Executing \`${instruction}\``);
                console.log("Command", instruction, "Args", arguments);
            }
            console.log(instruction);
            console.log(arguments);
            console.log(spawnOpts);
            const spawnedProcess = spawn(instruction, arguments, spawnOpts);

            let data = "";

            spawnedProcess.on("message", console.log);

            spawnedProcess.stdout.on("data", chunk => {
                if (!silenceOutput) {
                    console.log(chunk.toString());
                }

                data += chunk.toString();
            });

            spawnedProcess.stderr.on("data", chunk => {
                errorData += chunk.toString();
            });

            spawnedProcess.on("close", function (code) {
                if (code > 0) {
                    return reject(new Error(`${errorData} (Failed Instruction: ${instruction})(Arguments: ${arguments})`));
                }

                resolve(data);
            });

            spawnedProcess.on("error", function (err) {
                reject(err);
            });
        });
    }, 1000 * 60 * 10);
};

const sokratesExtractHistory = async function (repoPath) {
    let arguments = ['-jar', sokratesJarFilePath, 'extractGitHistory'];
    await spawnHelper('java', arguments, { cwd: repoPath });
};

const sokratesInit = async function (repoPath) {
    if (!fs.existsSync(repoPath + sokratesConfigPathAppender)) {
        execHelper('cd ' + repoPath + '&& java -jar ' + sokratesJarFilePath + ' init');
    }
};

const sokratesGenerateReport = async function (repoPath) {
    await spawnHelper('java', ['-jar', javaOptions, sokratesJarFilePath, 'generateReports'], { cwd: repoPath });
};


const moveResultsToLandscape = async function (analysisPath, landscapePath) {
    let sokratesFolderPath = analysisPath + '/_sokrates';
    if (fs.existsSync(landscapePath) && fs.existsSync(sokratesFolderPath)) {
        execHelper('rm -rf ' + landscapePath);
    }
    execHelper('cp -R ' + sokratesFolderPath + ' ' + landscapePath);
};

const sokratesUpdateLandscape = async function (landscape) {
    let path = sokratesPortfolio + landscape;
    console.log("Updates landscape: " + path);
    execHelper('cd ' + path + ' && java -jar ' + sokratesJarFilePath + ' updateLandscape');
};

const cleanFolderIgnores = async function (repoPath) {
    for (const folder of ignoreFolders) {
        execHelper('cd ' + repoPath + ' && find . -type d -name "' + folder + '" -exec rm -rf {} \\;');
    }
};
const cleanFileIgnores = async function (repoPath) {
    for (const file of ignoreFiles) {
        execHelper('cd ' + repoPath + ' && find . -type f -name "' + file + '" -delete');
    }
};
const optimizeForLandscape = async function (repoPath) {
    cleanFolderIgnores(repoPath);
    cleanFileIgnores(repoPath);
};

const getSourceCode = async function (repo, landscape, analysisPath) {

    if (!fs.existsSync(sokratesPortfolio + '/' + landscape)) {
        fs.mkdirSync(sokratesPortfolio + '/' + landscape);
    }

    if (!fs.existsSync(analysisPath)) {
        let repository = 'https://' + gitUser + '@' + gitBaseUrl + '/' + repo;
        let cloneCommand = 'git -c http.extraHeader="Authorization: Basic ' + PAT + '" clone ' + repository;
        console.log('Clone: ');
        console.log(cloneCommand);
        execHelper('cd ' + sokratesAnalysis + ' && ' + cloneCommand);
    } else {
        let pullCommand = 'git -c http.extraHeader="Authorization: Basic ' + PAT + '" pull';
        console.log('Pull: ');
        console.log(pullCommand);
        execHelper('cd ' + analysisPath + ' && ' + pullCommand);
    }
};

const updatePortfolio = async function () {
    for (const landscape of sokratesLandscapes) {
        for (const repository of landscape.repositories) {
            let landscapePath = sokratesPortfolio + '/' + landscape.name + '/' + repository.split('/').pop();
            let analysisPath = sokratesAnalysis + '/' + repository.split('/').pop();
            console.log("landscapePath: " + landscapePath);
            console.log("analysisPath: " + analysisPath);
            let source = await getSourceCode(repository, landscape.name, analysisPath);
            let extractor = await sokratesExtractHistory(analysisPath);
            let init = await sokratesInit(analysisPath);
            let optimizer = await optimizeForLandscape(analysisPath);
            let reports = await sokratesGenerateReport(analysisPath);
            let move = await moveResultsToLandscape(analysisPath, landscapePath);
        }
        console.log("Update landscape: " + landscape.name);
        let landscape_ = await sokratesUpdateLandscape('/' + landscape.name);
    }
    console.log("Update overall landscape");
    let landscape__ = await sokratesUpdateLandscape("");
}


updatePortfolio();
