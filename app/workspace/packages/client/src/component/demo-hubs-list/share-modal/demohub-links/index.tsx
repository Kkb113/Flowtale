import React from 'react';
import { IDemoHubConfig, P_RespDemoHub } from '../../../../types';
import * as Tags from './styled';
import UrlCodeShare from '../../../publish-preview/url-code-share';
import { baseURL } from '../../../../utils';

interface Props {
    demoHub : P_RespDemoHub;
    config : IDemoHubConfig | null
}

function DemoHubLinks(props : Props): JSX.Element {
  return (
    <Tags.EmbedCon>
      <div className="see-all-pages">
        <div className="typ-h2">Copy link to see al pages</div>
        <div className="url-container">
          <UrlCodeShare showOpenLinkButton url={`${baseURL}/hub/seeall/${props.demoHub.rid}`} />
        </div>
      </div>
      {
        props.config ? (props.config.qualification_page.qualifications.length > 0 && (
        <div className="qualification-links">
          <div className="typ-h2">Copy links for qualifications</div>
          {
            props.config.qualification_page.qualifications.map(qual => (
              <div className="qual-link" key={qual.id}>
                <div className="typ-reg url-title">{qual.title}</div>
                <div className="url-container">
                  <UrlCodeShare
                    showOpenLinkButton
                    url={`${baseURL}/hub/q/${props.demoHub.rid}/${qual.slug}`}
                  />
                </div>
              </div>
            ))
        }
        </div>
        )) : <p>Loading...</p>
      }
    </Tags.EmbedCon>
  );
}

export default DemoHubLinks;
