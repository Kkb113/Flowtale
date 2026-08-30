import * as ReactDOM from 'react-dom';
import React from 'react';
import * as Tags from './styled';

interface IOwnProps {}
interface IOwnStateProps {}

class SkipLink extends React.Component<IOwnProps, IOwnStateProps> {
  private portalRoot : HTMLDivElement;

  private portalContainer : HTMLDivElement;

  constructor(props: IOwnProps) {
    super(props);
    this.portalRoot = document.querySelector('#skip-link-container')!;
    this.portalContainer = document.createElement('div');
  }

  componentDidMount(): void {
    this.portalRoot.prepend(this.portalContainer);
  }

  componentWillUnmount(): void {
    this.portalRoot.removeChild(this.portalContainer);
  }

  render() {
    return ReactDOM.createPortal(
      <Tags.SkipLink href="#main">Skip to content</Tags.SkipLink>,
      this.portalContainer
    );
  }
}

export default SkipLink;
