import React from 'react';
import { HeartFilled } from '@ant-design/icons';
import { companiesUsingFable } from './data';
import * as Tags from './styled';

function CompanyCarousel(): JSX.Element {
  return (
    <Tags.CompanyCon>
      <div style={{
        fontSize: '0.8rem',
        color: '#757575',
        filter: 'saturate(0.5)',
        textAlign: 'center',
        marginBottom: '1rem'
      }}
      >
        <HeartFilled style={{ color: '#F44336' }} /> Loved by 1500+ customers across the globe!
      </div>
      <div
        style={{
          animationDuration: `${companiesUsingFable.length * 4}s`,
        }}
        className="companiesImg"
      >
        {companiesUsingFable.map(
          ({ source, companyName }, idx) => (
            <img
              src={source}
              alt={companyName}
              style={{ objectFit: 'contain' }}
              key={`${source}-${idx}`}
              className="companyLogo"
            />
          ),
        )}
        {companiesUsingFable.map(
          ({ source, companyName }, idx) => (
            <img
              src={source}
              alt={companyName}
              style={{ objectFit: 'contain' }}
              key={`${source}-${idx}`}
              className="companyLogo"
            />
          ),
        )}
      </div>
      <div
        style={{
          animationDuration: `${companiesUsingFable.length * 4}s`,
        }}
        className="companiesImg"
      >
        {companiesUsingFable.map(
          ({ source, companyName }, idx) => (
            <img
              src={source}
              alt={companyName}
              style={{ objectFit: 'contain' }}
              key={`${source}-${idx}`}
              className="companyLogo"
            />
          ),
        )}
        {companiesUsingFable.map(
          ({ source, companyName }, idx) => (
            <img
              src={source}
              alt={companyName}
              style={{ objectFit: 'contain' }}
              key={`${source}-${idx}`}
              className="companyLogo"
            />
          ),
        )}
      </div>
    </Tags.CompanyCon>
  );
}

export default CompanyCarousel;
