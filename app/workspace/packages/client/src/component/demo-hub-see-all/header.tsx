import React, { useState } from 'react';
import { BarsOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import { IDemoHubConfig } from '../../types';
import Cta from '../demo-hub-editor/cta';

interface Props {
    config: IDemoHubConfig;
  }

function Header(props: Props): JSX.Element {
  const [openMenu, setMenuOpen] = useState(false);

  return (
    <div className="header">
      <div className="logo">
        <img src={props.config.logo._val} alt={props.config.companyName._val} />
      </div>
      <div>
        <h1 className="typ-h1 title">{props.config.see_all_page.header.title}</h1>
      </div>
      <Tags.RespCTACon className="cta-con compact">
        <BarsOutlined
          className="menu-icon"
          onClick={() => {
            setMenuOpen(!openMenu);
          }}
        />
        <Tags.CTACon className={openMenu ? 'cta-con open-cta-con' : 'cta-con'}>
          {props.config.see_all_page.header.ctas.map((ctaId) => {
            const cta = props.config.cta.find(item => item.id === ctaId);
            if (!cta) return null;
            return (
              <Cta
                cta={cta}
                key={ctaId}
                className={`cta cta-${ctaId}`}
              />
            );
          })}
        </Tags.CTACon>
      </Tags.RespCTACon>
    </div>
  );
}

export default Header;
