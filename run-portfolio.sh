#!/bin/bash
extractGitHistory() {
    repoPath=$1
    sokratesJarFilePath=$2
    cd $repoPath && java -jar $sokratesJarFilePath extractGitHistory
}

sokratesInit() {
    repoPath=$1
    sokratesJarFilePath=$2
    sokratesConfigPathAppender=$3

    DIR=$repoPath+$sokratesConfigPathAppender
    if [ ! -d $DIR ]; then
        cd $repoPath && java -jar $sokratesJarFilePath init
    fi
}

sokratesGenerateReport() {
    repoPath=$1
    sokratesJarFilePath=$2
    javaOptions=$3
    cd $repoPath && java -jar $javaOptions $sokratesJarFilePath generateReports
}

moveResultsToLandscape() {
    analysisPath=$1
    landscapePath=$2
    sokratesFolderPath="${analysisPath}/_sokrates"
    cp -R $sokratesFolderPath $landscapePath
}

sokratesUpdateLandscape() {
    landscape=$1
    sokratesJarFilePath=$2
    sokratesPortfolio=$3
    path="${sokratesPortfolio}${landscape}"
    cd $path && java -jar $sokratesJarFilePath updateLandscape
}

cleanFolderIgnores() {
    repoPath=$1
    config=$2
    for item in  $(cat $config | jq -c '.ignoreFoldersForHistory[]'); do
        cd $repoPath && find . -type d -name $item -exec rm -rf "{}" \;
    done
}

cleanFileIgnores() {
    repoPath=$1
    config=$2
    for item in  $(cat $config | jq -c '.ignoreFiles[]'); do
        cd $repoPath && find . -type f -name '$item' -delete
    done
}

prepareLandscape() {
    sokratesPortfolio=$1
    landscapeName=$2
    DIR="${sokratesPortfolio}/${landscapeName}"
    if [ ! -d $DIR ]; then
        mkdir $DIR
    fi
}

getSourceCode() {
    repositoryName=$1
    analysisPath=$2
    sokratesAnalysisLocation=$3
    gitUser=$4
    gitBaseUrl=$5
    PAT=$6
    if [ ! -d $analysisPath ]; then
        repository="https://${gitUser}@${gitBaseUrl}/${repositoryName}"
        cd $sokratesAnalysis && git -c http.extraHeader="Authorization: Basic $PAT" clone $repository
    else
        cd $analysisPath && git -c http.extraHeader="Authorization: Basic $PAT" pull

    fi
}


config='/mnt/c/Users/Emhol/git/sokrates-portfolio/config_local_test.json'
sokratesConfigPathAppender='/_sokrates/config.json'
sokratesJarFilePath=$(cat $config | jq -r '.sokratesJarFilePath')
javaOptions=$(cat $config | jq -r '.javaOptions')
sokratesPortfolio=$(cat $config | jq -r '.sokratesPortfolio')
sokratesAnalysisLocation=$(cat $config | jq -r '.sokratesAnalysisLocation')
gitBaseUrl=$(cat $config | jq -r '.baseUrl')
gitUser=$(cat $config | jq -r '.defaultUser')
PAT=$(cat $config | jq -r '.Base64PAT')

sokratesLandscapes=$(cat $config | jq -c '.landscapes[]')

for item in $(cat $config | jq -c '.landscapes[]'); do
    landscapeName=$(jq '.name' <<<"$item")
    landscapeName="${landscapeName%\"}"
    landscapeName="${landscapeName#\"}"
    echo "Starting analysis of $landscapeName"
    for repoItem in $(jq '.repositories[]' <<<"$item"); do
        repositoryName=$(basename ${repoItem})
        repositoryName="${repositoryName%\"}"
        repositoryName="${repositoryName#\"}"
        landscapePath="${sokratesPortfolio}/${landscapeName}/${repositoryName}"
        echo "LandscapePath: $landscapePath"
        analysisPath="${sokratesAnalysisLocation}/${repositoryName}"
        echo "AnalysisPath: $analysisPath"
        prepareLandscape $sokratesPortfolio $landscapeName
        getSourceCode $repositoryName $analysisPath $sokratesAnalysisLocation $gitUser $gitBaseUrl $PAT

        extractGitHistory $analysisPath $sokratesJarFilePath
        sokratesInit $analysisPath $sokratesJarFilePath $sokratesConfigPathAppender

        cleanFolderIgnores $analysisPath $config
        cleanFileIgnores $analysisPath $config

        sokratesGenerateReport $analysisPath $sokratesJarFilePath $javaOptions
        moveResultsToLandscape $analysisPath $landscapePath
    done

    sokratesUpdateLandscape '/'+$landscapeName $sokratesJarFilePath $sokratesPortfolio
done

sokratesUpdateLandscape "" $sokratesJarFilePath $sokratesPortfolio
