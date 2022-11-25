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
    sokratesConventionsFile=$4

    DIR=$repoPath+$sokratesConfigPathAppender
    if [ ! -d $DIR ]; then
        if [ -z "$sokratesConventionsFile" ]; then
        cd $repoPath && java -jar $sokratesJarFilePath init
        else
        cd $repoPath && java -jar $sokratesJarFilePath init -conventionsFile $sokratesConventionsFile
        fi
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

    Azure='azure'
    if [[ "$gitBaseUrl" == *"$Azure"* ]]; then
        B64_PAT=$(printf "%s"":$PAT" | base64)
        if [ ! -d $analysisPath ]; then
            repository="https://${gitUser}@${gitBaseUrl}/${repositoryName}"
            cd $sokratesAnalysisLocation && git -c http.extraHeader="Authorization: Basic $B64_PAT" clone $repository
        else
            cd $analysisPath && git -c http.extraHeader="Authorization: Basic $B64_PAT" pull
        fi
    else
        if [ ! -d $analysisPath ]; then
            repository="https://${gitUser}:${PAT}@${gitBaseUrl}/${repositoryName}.git"
            cd $sokratesAnalysisLocation && git clone $repository
        else
            repository="https://${gitUser}:${PAT}@${gitBaseUrl}/${repositoryName}.git"
            git remote set-url origin $repository
            cd $analysisPath && git pull
        fi
    fi


}

 copyForMicroServiceLandscape(){   
    repoPath=$1 
    aggregated_landscape=$3
   
     if [ ! -d $aggregated_landscape ]; then
        mkdir $aggregated_landscape
    fi
    cp -R $repoPath $aggregated_landscape
}

removeArtifacts(){
  analysisPath=$1
  cd $analysisPath && cd _sokrates && rm -r findings && rm -r history && rm -r reports
}

config=$1
sokratesConfigPathAppender='/_sokrates/config.json'
sokratesJarFilePath=$(cat $config | jq -r '.sokratesJarFilePath')
sokratesConventionsFile=$(cat $config | jq -r '.sokratesConventionsFile')
javaOptions=$(cat $config | jq -r '.javaOptions')
removeSokratesArtefactsBeforeAnalysis=$(cat $config | jq -r '.removeSokratesArtefactsBeforeAnalysis')
systemsAreMicroservices=$(cat $config | jq -r '.systemsAreMicroservices')
sokratesPortfolio=$(cat $config | jq -r '.sokratesPortfolio')
sokratesAnalysisLocation=$(cat $config | jq -r '.sokratesAnalysisLocation')
gitBaseUrl=$(cat $config | jq -r '.baseUrl')
gitUser=$(cat $config | jq -r '.defaultUser')
PAT=$(cat $config | jq -r '.PAT')


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
    
        if [ "$removeSokratesArtefactsBeforeAnalysis" ]; then
            removeArtifacts $analysisPath
        fi
    
        getSourceCode $repositoryName $analysisPath $sokratesAnalysisLocation $gitUser $gitBaseUrl $PAT
        
        if [ "$systemsAreMicroservices" ]; then
            aggregated_landscape="${sokratesAnalysisLocation}/Aggregated_${landscapeName}" 
            copyForMicroServiceLandscape $analysisPath $sokratesAnalysisLocation $aggregated_landscape
        fi
        
    
        extractGitHistory $analysisPath $sokratesJarFilePath
        sokratesInit $analysisPath $sokratesJarFilePath $sokratesConfigPathAppender $sokratesConventionsFile

        cleanFolderIgnores $analysisPath $config
        cleanFileIgnores $analysisPath $config

        sokratesGenerateReport $analysisPath $sokratesJarFilePath $javaOptions
        moveResultsToLandscape $analysisPath $landscapePath
       
    done

    if [ "$systemsAreMicroservices" ]; then
        aggregated_landscape="${sokratesAnalysisLocation}/Aggregated_${landscapeName}" 
        sokratesInit $aggregated_landscape $sokratesJarFilePath $sokratesConfigPathAppender $sokratesConventionsFile
        
        sokratesGenerateReport $aggregated_landscape $sokratesJarFilePath $javaOptions
    fi
    sokratesUpdateLandscape "/${landscapeName}" $sokratesJarFilePath $sokratesPortfolio
done

sokratesUpdateLandscape "" $sokratesJarFilePath $sokratesPortfolio
