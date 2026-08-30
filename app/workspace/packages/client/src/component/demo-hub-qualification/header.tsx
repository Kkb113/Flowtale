import React, { useEffect, useState } from 'react';
import { BarsOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import Cta from '../demo-hub-editor/cta';
import { useDemoHubQlfcnCtx } from './ctx';

function Header(): JSX.Element {
  const { config } = useDemoHubQlfcnCtx();
  const [openMenu, setMenuOpen] = useState(false);
  const [header, setHeader] = useState(config.qualification_page.header);

  useEffect(() => {
    setHeader(config.qualification_page.header);
  }, [config.qualification_page.header]);

  return (
    <div className="header">
      <div className="logo">
        <img src={config.logo._val} alt={config.companyName._val} />
      </div>
      <div>
        <h1 className="typ-h1 title">{header.title}</h1>
      </div>
      <Tags.RespCTACon className="cta-con compact">
        <BarsOutlined
          className="menu-icon"
          onClick={() => {
            setMenuOpen(!openMenu);
          }}
        />
        <Tags.CTACon className={openMenu ? 'cta-con open-cta-con' : 'cta-con'}>
          {header.ctas.map((ctaId) => {
            const cta = config.cta.find(item => item.id === ctaId);
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
