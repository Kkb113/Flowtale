const fs = require('fs');
const deepcopy = require('deepcopy');

// INFO 1. update this
const idxm = {};
// INFO 2. download the newly created tour/index.json file in the same dir and name it as __source.json
//          {s3 bucket}/root/tour/{proxyassethash}

const createLiteralProperty = (val) => ({
    type: 1,
    from: '',
    _val: val
});

const tourDataFile = JSON.parse(fs.readFileSync('__source.json', 'utf8'))
const newEntities = {};
for (const [screenId, entity] of Object.entries(tourDataFile.entities)) {
    if (screenId in idxm) {
        const newEntity = deepcopy(entity);
        const newScreenId = idxm[screenId];

        if (newEntity.type === 'screen') {
            for (const ann of Object.values(newEntity.annotations)) {
                for (const btn of ann.buttons) {
                    if (btn.hotspot && btn.hotspot.actionType === 'navigate') {
                        const actionValueSplit = btn.hotspot.actionValue._val.split('/');
                        if (actionValueSplit[0] in idxm) {
                            actionValueSplit[0] = idxm[actionValueSplit[0]];
                            btn.hotspot.actionValue = createLiteralProperty(actionValueSplit.join('/'));
                        }
                    }
                }
            }
        }

        newEntity.ref = newScreenId;
        newEntities[newScreenId] = newEntity;
    } else {
        newEntities[screenId] = entity;
    }
}
tourDataFile.entities = newEntities;

if (tourDataFile.opts?.main) {
    const mainSplit = tourDataFile.opts.main.split('/');
    if (mainSplit[0] in idxm) {
        mainSplit[0] = idxm[mainSplit[0]];
        tourDataFile.opts.main = mainSplit.join('/');
    }
}

if (tourDataFile.journey?.flows.length > 0) {
    tourDataFile.journey.flows.forEach(flow => {
        const mainSplit = flow.main.split('/');
        if (mainSplit[0] in idxm) {
            mainSplit[0] = idxm[mainSplit[0]];
            flow.main = mainSplit.join('/');
        }
    });
}

fs.writeFileSync('__dest.json', JSON.stringify(tourDataFile, null, 2));

// INFO run it as node idxm.js
// INFO upload __dest.json -> index.json in s3
// INFO delete __source.json and __dest.json
