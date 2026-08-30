import React, { useEffect, useRef, useState } from 'react';
import { DatabaseOutlined, FontSizeOutlined, LoadingOutlined, WarningOutlined } from '@ant-design/icons';
import { IAnnotationConfig } from '@fable/common/dist/types';
import * as Tags from './styled';
import Button from '../button';
import { DatasetConfig, EditItem, PerVarData, PerVarType, ScreenSizeData } from '../../types';
import {
  extractDatasetParams,
  getPersVarsFromAnnotations,
  getPersVarsFromEdits,
  getPrefilledPerVarsFromLS,
  recordToQueryParams,
  setPersValuesInLS
} from '../../utils';
import { InputText } from '../screen-editor/styled';
import { P_Dataset, P_RespTour } from '../../entity-processor';
import { loadDatasetConfigs } from '../../action/creator';

interface Props {
  tour: P_RespTour;
  isLoading?: boolean;
  changePersVarParams: (persVarsParams: string) => void;
  annotationsForScreens: Record<string, IAnnotationConfig[]>;
  originalPersVarsParams: string;
  setShowEditor: (showPersVarsEditor: boolean) => void;
  datasets: P_Dataset[];
  edits: EditItem[]
}

export default function PersonalVarEditor(props: Props): JSX.Element {
  const [perVarsInTour, setPerVarsInTour] = useState<PerVarData>({});
  const [datasetConfigs, setDatasetConfigs] = useState<{name: string, config: DatasetConfig}[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  function resetLocalStoreObj(): void {
    const emptyPerVarsInTour: PerVarData = {};

    Object.keys(perVarsInTour).forEach(key => {
      emptyPerVarsInTour[key] = { ...perVarsInTour[key], val: '' };
    });

    setPersValuesInLS(emptyPerVarsInTour, props.tour.rid);
  }

  function saveParamsHandler() : void {
    const searchParamStr = recordToQueryParams(
      { ...convertPerVarsToNameValMap() },
      props.originalPersVarsParams
    );
    props.changePersVarParams(`?${searchParamStr}`);
  }

  function convertPerVarsToNameValMap(): Record<string, string> {
    const varNameValMap: Record<string, string> = {};

    Object.keys(perVarsInTour).forEach(name => {
      const item = perVarsInTour[name];
      let key = `v_${name}`;
      if (item.type === PerVarType.DATASET) key = `fv_${name}`;
      varNameValMap[key] = item.val;
    });
    return varNameValMap;
  }

  function handleDiscard() : void {
    resetLocalStoreObj();

    setPerVarsInTour((prevParams) => {
      const updatedParams = Object.keys(prevParams).reduce((acc, key) => {
        acc[key] = { ...prevParams[key], val: '' };
        return acc;
      }, {} as PerVarData);

      return updatedParams;
    });
    props.changePersVarParams(props.originalPersVarsParams);
    props.setShowEditor(false);
  }

  useEffect(() => {
    const perVars = {
      ...getPersVarsFromAnnotations(props.annotationsForScreens),
      ...getPersVarsFromEdits(props.edits)
    };

    const perVarsObj = getPrefilledPerVarsFromLS(perVars, props.tour.rid);
    setPerVarsInTour(perVarsObj);
  }, [props.annotationsForScreens, props.edits]);

  useEffect(() => {
    setPersValuesInLS(perVarsInTour, props.tour.rid);
  }, [perVarsInTour]);

  useEffect(() => {
    async function getDatasetConfigs(): Promise<void> {
      const configs = await loadDatasetConfigs(props.datasets || []);
      setDatasetConfigs(configs);
    }
    getDatasetConfigs();
  }, [props.datasets]);

  useEffect(() => {
    validatePersVars();
  }, [perVarsInTour]);

  const validatePersVars = (): void => {
    const warningStrs = Object.keys(perVarsInTour)
      .map(perVarName => {
        const value = perVarsInTour[perVarName].val;
        const type = perVarsInTour[perVarName].type;

        if (!value) return `Variable ${perVarName} is not set`;

        if (type === PerVarType.DATASET) {
          const sP = new URLSearchParams();
          sP.set(`fv_${perVarName}`, value);
          const dsQueries = extractDatasetParams(sP);

          const table = dsQueries.tables[0];

          const tableQueries = dsQueries.queries[perVarName];
          if (!tableQueries || (tableQueries.queries.length === 0)) {
            return `Variable ${perVarName}: query is not valid`;
          }

          if (tableQueries.queries.find(q => !q.operator || !q.value)) {
            return `Variable ${perVarName}: query is not valid`;
          }

          if (!props.datasets) return '';

          if (!props.datasets.find(ds => ds.name.toLowerCase() === table.toLowerCase())) {
            return `Variable ${perVarName}: ${table} dataset is not present`;
          }

          const dsConfig = datasetConfigs?.find(conf => conf.name.toLowerCase() === table.toLowerCase());
          if (!dsConfig) return '';

          for (const tableQuery of tableQueries.queries) {
            const columnsInDs = dsConfig.config.data.table.columns;
            const queryColumnName = tableQuery.columnName;
            if (!columnsInDs.find(col => col.name.toLowerCase() === queryColumnName.toLowerCase())) {
              return `Variable ${perVarName}: ${queryColumnName} is not present in ${table}`;
            }
          }
        }

        return '';
      }).filter(v => !!v);
    setWarnings(warningStrs);
  };

  return (
    <Tags.VarEditorCon>
      <p className="typ-h1">Personalize demo</p>
      {
          !props.isLoading ? (
            <>
              {Object.keys(perVarsInTour).length > 0
                ? (
                  <div className="typ-reg">
                    We have detected the following variables in your demo.
                    Enter value for these variabes to personalize the demo.

                    <div className="demo-url typ-sm">
                      <span>
                        URL Parameter:
                      </span>
                      <code>
                        <span className="url-code">?</span>
                        <span className="url-code">
                          {recordToQueryParams(convertPerVarsToNameValMap()).trim()}
                        </span>
                      </code>
                    </div>
                  </div>
                ) : (
                  <div className="no-vars-text" style={{ maxHeight: '360px', overflowY: 'scroll' }}>
                    <div className="typ-reg">
                      Use variables in annotation message and pass variable values from
                      URL parameter to personalize your demo
                    </div>
                    <ul className="typ-reg">
                      <li>
                        {/* eslint-disable-next-line max-len */}
                        You can simply use a variable <code>{'{{ first_name }}'}</code> in annotation text to personalize the demo
                      </li>
                      <li>
                        {/* eslint-disable-next-line max-len */}
                        Pass the variable value via URL parameter <code>?v_first_name=John+Doe</code> to personalize the demo for <em>John Doe</em>
                      </li>
                      <li>
                        {/* eslint-disable-next-line max-len */}
                        You can alternatively create a <em>Dataset</em> and use a column from the dataset <code>{'{{ person.first_name }}'}</code> to personalize the demo
                      </li>
                      <li>
                        {/* eslint-disable-next-line max-len */}
                        Pass the dataset and selected row via URL parameter <code>?fv_person=people(account.is.acme)</code> to personalize demo for a buyer who is from acme.
                      </li>

                    </ul>
                    <p className="typ-reg">
                      {/* eslint-disable-next-line max-len */}
                      Once you add variable(s) in the annotation message, come back here to check how this demo can be personalized.
                    </p>
                  </div>
                )}
              {Object.keys(perVarsInTour).length > 0 && (
              <>
                <div className="per-var-input-con custom-scrollbar">
                  {
                Object.keys(perVarsInTour).map((perVar, index) => (
                  <div key={perVar} className="per-var-input-wrapper">
                    <div className="pers-var-input">
                      <label htmlFor={perVar} className="typ-reg pervar-label">
                        {perVarsInTour[perVar].type === PerVarType.DATASET
                          ? <DatabaseOutlined />
                          : <FontSizeOutlined />}
                        <code>{perVar}</code>
                      </label>
                      <InputText
                        id={perVar}
                        style={{ padding: '0.5rem 0.75rem' }}
                        value={perVarsInTour[perVar].val}
                        onChange={(e) => {
                          setPerVarsInTour(prev => (
                            {
                              ...prev,
                              [perVar]: {
                                ...prev[perVar],
                                val: e.target.value,
                              }
                            }
                          ));
                        }}
                      />
                    </div>
                    {
                      perVarsInTour[perVar].type === PerVarType.DATASET && (
                        <div className="pers-vars-info">
                          <div>Format: dataset_name(column_name.is.value)</div>
                          <div>Example: currency(country.is.usa)</div>
                        </div>
                      )
                    }
                  </div>
                ))
              }
                </div>
                <div className="errors custom-scrollbar">
                  {
                    warnings.map(warning => (
                      <div key={warning} className="error typ-sm">
                        <WarningOutlined style={{ color: 'red' }} />
                        &nbsp;{warning}
                      </div>
                    ))
                  }
                </div>
                <div className="bottom-btns">
                  <Button
                    className="btns"
                    size="medium"
                    intent="secondary"
                    onClick={() => handleDiscard()}
                  >
                    Discard
                  </Button>
                  <Button
                    className="btns"
                    size="medium"
                    intent="primary"
                    onClick={() => saveParamsHandler()}
                  >
                    Apply
                  </Button>
                </div>
              </>)}
            </>
          ) : <p className="typ-reg loading-state"><LoadingOutlined /> Loading...</p>
        }
    </Tags.VarEditorCon>
  );
}
