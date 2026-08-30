import { useAuth0 } from '@auth0/auth0-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LogoutType } from '@fable/common/dist/constants';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { UnauthorizedReason } from '@fable/common/dist/api-contract';
import Loader from '../loader';
import InfoCon, { InfoBtn } from '../info-con';
import FullPageTopLoader from '../loader/full-page-top-loader';
import { FABLE_LOCAL_STORAGE_ORG_ID_KEY } from '../../constants';
import { OurLink } from '../../common-styled';

interface Props {
  title: string,
}

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

export default function Logout(props: Props): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth0();
  const [msg, setMsg] = useState(<></>);
  const [heading, setHeading] = useState('');
  const [btns, setBtns] = useState<Array<InfoBtn>>([]);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    document.title = props.title;

    const logoutTypeRaw = searchParams.get('t');
    let logoutType = 0;

    if (logoutTypeRaw) logoutType = +logoutTypeRaw;
    // For force logout always clear org so that switch is easier
    else localStorage.removeItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY);

    switch (logoutType) {
      case LogoutType.AccessTokenInvalidated:
        setHeading('Insufficient permission');
        setMsg(
          <>
            <p>
              Your session has expired. Please login again to continue.
            </p>
            <p>
              <em>This might happen due to a long period of inactivity.</em>
            </p>
          </>
        );
        setShowLoader(false);
        setBtns([{
          type: 'primary',
          text: 'Logout',
          linkTo: '/logout'
        }]);
        raiseDeferredError(new Error(`Forced user to logout page for logoutType=${logoutType}`));
        break;

      case LogoutType.APINotAutorized: {
        const reason = searchParams.get('r');
        setHeading('Insufficient permission');
        setMsg(
          reason === UnauthorizedReason.EmailIdExistsButLoginMethodDoesNotMatch ? (
            <>
              <p>
                EmailId exists but a different login method has been used previously. Please logout and use correct login method.
              </p>
              <p>
                <OurLink target="_self" href="https://www.sharefable.com/contact-support" style={{ display: 'inline' }}>Contact support</OurLink> if you think you are using the correct login method.
              </p>
            </>
          ) : (
            <p>
              Either your session has expired or you don't have access to requested resource. Please login using correct account.
            </p>
          )
        );
        setShowLoader(false);
        const actionBtns: InfoBtn[] = [{
          type: 'secondary',
          text: 'Logout',
          linkTo: '/logout'
        }];
        if (!(reason === UnauthorizedReason.OrgSuggestedButInvalidAssociation || reason === UnauthorizedReason.EmailIdExistsButLoginMethodDoesNotMatch)) {
          actionBtns.push({
            type: 'secondary',
            text: 'See all demos',
            linkTo: '/demos'
          });
        } else if (reason !== UnauthorizedReason.EmailIdExistsButLoginMethodDoesNotMatch) {
          actionBtns.push({
            type: 'primary',
            text: 'Select organization',
            linkTo: '/select-org'
          });
        } else {
          localStorage.removeItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY);
        }
        setBtns(actionBtns);

        raiseDeferredError(new Error(`Forced user to logout page for logoutType=${logoutType}`));
        break;
      }

      default:
        setHeading('Logging out...');
        setMsg(
          <Loader width="120px" />
        );
        setBtns([]);
        setShowLoader(true);
        setTimeout(() => {
          logout({ logoutParams: { returnTo: `${APP_CLIENT_ENDPOINT}/login` } });
        }, 1500);

        break;
    }
  }, [searchParams]);

  return (
    <div>
      {
        showLoader
          ? <FullPageTopLoader showLogo text="Logging out" />
          : <InfoCon
              heading={heading}
              body={msg}
              btns={btns}
          />
      }
    </div>
  );
}
