const fs = require('fs')
const chalk = require('chalk')

const config = require('./../../../config.json')
const categoryHelper = require(`./getCategory.js`)
const entityHelper = require('./getEntityMap.js')
const ParsedUrl = require('./parseUrl.js')
class sharedData {
    constructor (config) {
        console.log(chalk.green("Reading static data"))
        const build = `${config.trackerDataLoc}/build-data`

        this.config = config
        this.policies = _getJSON(`${build}/static/privacy_policies.json`)
        this.surrogates = _getJSON(`${build}/static/surrogates.json`)
        this.domains = _getJSON(`${build}/generated/domain_summary.json`) || {}
        this.abuseScores = _getJSON(`${build}/static/api_fingerprint_weights.json`)
        this.categories = _getCategories()
        this.domainToEntity = _readEntities()
        this.entityMap = entityHelper.entityMap(`${config.trackerDataLoc}/entities`)
        this.breaking = _getBreaking(`${build}/static/breaking`)
    }
}

// map entity domains to name for easy lookup
function _readEntities () {
    return fs.readdirSync(`${config.trackerDataLoc}/entities/`).reduce((domainList, entityFile) => {
        const entityData = _getJSON(`${config.trackerDataLoc}/entities/${entityFile}`)
        entityData.properties.forEach(url => {
            domainList[url] = entityData
        })
        return domainList
    }, {})
}

// read tracker category data from csv and return object
function _getCategories (domain) {
    return categoryHelper.getCategories(`${config.trackerDataLoc}/build-data/static/categorized_trackers.csv`)
}

// read temp and longterm breaking requests files. return breaking data object keyed on domain
function _getBreaking (dirPath) {
    const files = fs.readdirSync(dirPath)
    return files.reduce((breakingData, file) => {

        const key = file.replace('.json', '')
        const data = _getJSON(`${dirPath}/${file}`)

        // group the breaking request type data by domain for faster look up
        if (file.match('breaking-request')){
            const groupedData = data.reduce((grouped, entry) => {
                // unescape and get domain key
                const domain = new ParsedUrl(`http://${entry.rule.replace(/\\/g, "")}`).domain
                grouped[domain] ? grouped[domain].push(entry) : grouped[domain] = [entry]
                return grouped
            }, {})

            breakingData[key] = groupedData
        } else {
            breakingData[key] = data
        }

        return breakingData
    }, {})
}

function _getJSON (path) {
    try {
        return JSON.parse(fs.readFileSync(path, 'utf8'))
    } catch (e) {
        console.log(e)
    }
}

module.exports = new sharedData (config)
