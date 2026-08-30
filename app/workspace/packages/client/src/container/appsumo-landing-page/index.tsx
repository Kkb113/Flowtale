import React from 'react';
import { connect } from 'react-redux';
import { ArrowsAltOutlined } from '@ant-design/icons';
import { Interval } from '@fable/common/dist/api-contract';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { TState } from '../../reducer';
import * as Tags from './styled';
import FableLogo from '../../assets/fable_logo_light_bg.png';
import AppSumoLogo from '../../assets/appsumo_logo.svg';

const mapDispatchToProps = (dispatch: any) => ({ });

const mapStateToProps = (state: TState) => ({
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps> & WithRouterProps<{
}>;

interface IOwnStateProps {
  err?: string;
}

class AppSumoLandingPage extends React.PureComponent<IProps, IOwnStateProps> {
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(props: IProps) {
    super(props);
    this.state = {
      err: undefined
    };
  }

  clearTimers() {
    this.timers.forEach(timer => clearTimeout(timer));
  }

  componentDidMount() {
    document.title = this.props.title;
    const searchParams = new URLSearchParams(this.props.location.search);
    const license: string = searchParams.get('l') || '';
    const err: string = searchParams.get('err') || '';
    if (err.trim()) {
      this.setState({ err });
    }
    if (license) {
      // asll -> appsumo lifetime license
      localStorage.setItem('fable/asll', license);
      !err && this.timers.push(setTimeout(() => {
        this.clearTimers();
        this.props.navigate('/');
      }, 2000));
    }
  }

  render() {
    return (
      <Tags.Con>
        <div className="img-header">
          <img src={FableLogo} alt="fable-log" height={48} />
          <ArrowsAltOutlined
            style={{
              fontSize: '3rem'
            }}
            rotate={45}
          />
          <img src={AppSumoLogo} alt="fable-log" height={36} />
        </div>
        {this.state.err ? (
          <div className="body">
            <div className="typ-h1 err-line">
              Something went wrong while connecting to AppSumo ⛈️
            </div>
            <div className="typ-h2">
              You might have to reactivate Fable from AppSumo dashboard
            </div>
            <div className="typ-reg">
              If the problem persists write to us @ <a href="mailto:support@sharefable.com?subject=AppSumo%20connection%20error">support@sharefable.com</a>
            </div>
            <div className="err-details">
              <div className="header">
                Error details
              </div>
              <pre>
                {this.state.err}
              </pre>
            </div>
          </div>
        ) : (
          <div className="body">
            <div className="typ-h1">
              Things are looking good ☀️ Please wait while we set things up for you.
            </div>
            <div className="typ-h2">
              You will be automatically redirected to Fable in couple of seconds.
            </div>
            <div className="typ-reg">
              Please don't refresh this page or go back.
            </div>
          </div>
        )}
      </Tags.Con>
    );
  }
}

export default connect<ReturnType<typeof mapStateToProps>, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(AppSumoLandingPage));
