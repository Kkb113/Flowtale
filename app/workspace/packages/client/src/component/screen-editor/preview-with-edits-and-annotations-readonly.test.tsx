import { IAnnotationButton, ITourEntityHotspot } from '@fable/common/dist/types';
import { createLiteralProperty } from '@fable/common/dist/utils';
import { getCtaButtonForNavigation } from '../annotation';
import ScreenPreviewWithEditsAndAnnotationsReadonly, {
  IOwnProps,
  MultiAnnotationBranchContext
} from './preview-with-edits-and-annotations-readonly';

jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

const createBranchContext = (): MultiAnnotationBranchContext => ({
  originAnnotationRefId: null,
  branchRootAnnotationRefId: null,
});

const createNavigateHotspot = (destination: string): ITourEntityHotspot => ({
  type: 'an-btn',
  on: 'click',
  target: '$this',
  actionType: 'navigate',
  actionValue: createLiteralProperty(destination)
});

const createOpenHotspot = (url: string): ITourEntityHotspot => ({
  type: 'an-btn',
  on: 'click',
  target: '$this',
  actionType: 'open',
  actionValue: createLiteralProperty(url),
  openInSameTab: true,
});

const createProps = (
  updateCurrentFlowMain: jest.Mock,
  flows: Array<{ main: string }>,
  multiAnnotationBranchContext?: MultiAnnotationBranchContext,
): IOwnProps => ({
  resizeSignal: 1,
  playMode: false,
  toAnnotationId: 'main-annotation',
  tourDataOpts: { main: '100/main-annotation' },
  allAnnotationsForTour: [{
    screen: { id: 200 },
    annotations: [{
      refId: 'multi-annotation',
      buttons: [{ type: 'prev', hotspot: null }]
    }]
  }],
  flows,
  updateCurrentFlowMain,
  multiAnnotationBranchContext
} as unknown as IOwnProps);

interface BranchFixtureOptions {
  includeBranchLeadForm?: boolean;
  includeSecondBranchStep?: boolean;
  includeLeadForm?: boolean;
}

interface TestAnnotation {
  refId: string;
  zId: string;
  isLeadFormPresent?: boolean;
  buttons: Array<{
    id: string;
    type: string;
    hotspot: ITourEntityHotspot | null;
  }>;
}

const createBranchProps = (
  updateCurrentFlowMain: jest.Mock,
  mainNextHotspot: ITourEntityHotspot | null,
  branchContext: MultiAnnotationBranchContext,
  options: BranchFixtureOptions = {},
): IOwnProps => {
  const mainNext = options.includeLeadForm
    ? createNavigateHotspot('150/lead-annotation')
    : mainNextHotspot;
  const branchNext = options.includeSecondBranchStep
    ? createNavigateHotspot('300/branch-annotation-2')
    : options.includeBranchLeadForm
      ? createNavigateHotspot('400/branch-lead-annotation')
      : null;
  const allAnnotationsForTour: Array<{
    screen: { id: number };
    annotations: TestAnnotation[];
  }> = [{
    screen: { id: 100 },
    annotations: [{
      refId: 'main-annotation',
      zId: 'shared-z-id',
      buttons: [
        { id: 'main-prev', type: 'prev', hotspot: null },
        { id: 'main-next', type: 'next', hotspot: mainNext }
      ]
    }, {
      refId: 'branch-annotation',
      zId: 'shared-z-id',
      buttons: [
        { id: 'branch-prev', type: 'prev', hotspot: null },
        { id: 'branch-next', type: 'next', hotspot: branchNext }
      ]
    }, {
      refId: 'unrelated-annotation',
      zId: 'unrelated-z-id',
      buttons: [
        { id: 'unrelated-prev', type: 'prev', hotspot: null },
        { id: 'unrelated-next', type: 'next', hotspot: null }
      ]
    }]
  }, {
    screen: { id: 200 },
    annotations: [{
      refId: 'next-annotation',
      zId: 'next-z-id',
      buttons: [
        {
          id: 'next-prev',
          type: 'prev',
          hotspot: createNavigateHotspot(
            options.includeLeadForm ? '150/lead-annotation' : '100/main-annotation'
          )
        },
        { id: 'next-next', type: 'next', hotspot: null }
      ]
    }]
  }];

  if (options.includeSecondBranchStep) {
    allAnnotationsForTour.push({
      screen: { id: 300 },
      annotations: [{
        refId: 'branch-annotation-2',
        zId: 'branch-step-2-z-id',
        buttons: [
          {
            id: 'branch-2-prev',
            type: 'prev',
            hotspot: createNavigateHotspot('100/branch-annotation')
          },
          { id: 'branch-2-next', type: 'next', hotspot: null }
        ]
      }]
    });
  }

  if (options.includeLeadForm) {
    allAnnotationsForTour.push({
      screen: { id: 150 },
      annotations: [{
        refId: 'lead-annotation',
        zId: 'lead-z-id',
        isLeadFormPresent: true,
        buttons: [
          {
            id: 'lead-prev',
            type: 'prev',
            hotspot: createNavigateHotspot('100/main-annotation')
          },
          {
            id: 'lead-next',
            type: 'next',
            hotspot: mainNextHotspot
          }
        ]
      }]
    });
  }

  if (options.includeBranchLeadForm) {
    allAnnotationsForTour.push({
      screen: { id: 400 },
      annotations: [{
        refId: 'branch-lead-annotation',
        zId: 'branch-lead-z-id',
        isLeadFormPresent: true,
        buttons: [
          {
            id: 'branch-lead-prev',
            type: 'prev',
            hotspot: createNavigateHotspot('100/branch-annotation')
          },
          { id: 'branch-lead-next', type: 'next', hotspot: null }
        ]
      }]
    });
  }

  return {
    ...createProps(updateCurrentFlowMain, [], branchContext),
    playMode: true,
    navigate: jest.fn(),
    updateJourneyProgress: jest.fn(),
    shouldSkipLeadForm: Boolean(
      options.includeLeadForm || options.includeBranchLeadForm
    ),
    toAnnotationId: 'main-annotation',
    allAnnotationsForTour,
  } as unknown as IOwnProps;
};

const useSynchronousSetState = (
  component: ScreenPreviewWithEditsAndAnnotationsReadonly
): void => {
  component.setState = jest.fn((update) => {
    const nextState = typeof update === 'function'
      ? update(component.state, component.props)
      : update;
    component.state = { ...component.state, ...nextState };
  });
};

describe('ScreenPreviewWithEditsAndAnnotationsReadonly', () => {
  it('does not complete the current flow when opening an optional multi-annotation', () => {
    const updateCurrentFlowMain = jest.fn();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createProps(updateCurrentFlowMain, [])
    );
    component.reachAnnotation = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('multi-annotation');

    expect(component.reachAnnotation).toHaveBeenCalledWith('multi-annotation');
    expect(updateCurrentFlowMain).not.toHaveBeenCalled();
  });

  it('updates the current flow when the selected annotation belongs to a configured flow', () => {
    const updateCurrentFlowMain = jest.fn();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createProps(updateCurrentFlowMain, [{ main: '200/multi-annotation' }])
    );
    component.reachAnnotation = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('multi-annotation');

    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '200/multi-annotation');
  });

  it('does not change editor state when selecting outside play mode', () => {
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createProps(jest.fn(), [], createBranchContext())
    );
    component.setState = jest.fn();
    component.reachAnnotation = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('multi-annotation');

    expect(component.setState).not.toHaveBeenCalled();
    expect(component.reachAnnotation).toHaveBeenCalledWith('multi-annotation');
  });

  it('resumes the main path when a terminal multi-annotation advances', () => {
    const updateCurrentFlowMain = jest.fn();
    const branchContext = createBranchContext();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        updateCurrentFlowMain,
        createNavigateHotspot('200/next-annotation'),
        branchContext
      )
    );
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();
    component.applyDiffAndGoToAnn = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');
    const result = component.updateCurrentFlowMain('next');

    expect(result).toEqual({ handled: true });
    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation',
      '200/next-annotation'
    );
    expect(updateCurrentFlowMain).not.toHaveBeenCalled();
    expect(branchContext).toEqual(createBranchContext());
  });

  it('returns to the branch origin when an unconfigured Back button is used', () => {
    const updateCurrentFlowMain = jest.fn();
    const branchContext = createBranchContext();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        updateCurrentFlowMain,
        createNavigateHotspot('200/next-annotation'),
        branchContext
      )
    );
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();
    component.applyDiffAndGoToAnn = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');
    const result = component.updateCurrentFlowMain('prev');

    expect(result).toEqual({ handled: true });
    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation',
      '100/main-annotation'
    );
    expect(updateCurrentFlowMain).not.toHaveBeenCalled();
  });

  it('preserves completion when both the branch and its origin are terminal', () => {
    const updateCurrentFlowMain = jest.fn();
    const branchContext = createBranchContext();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(updateCurrentFlowMain, null, branchContext)
    );
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();
    component.applyDiffAndGoToAnn = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');
    const result = component.updateCurrentFlowMain('next');

    expect(result).toBeUndefined();
    expect(component.applyDiffAndGoToAnn).not.toHaveBeenCalled();
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('next', undefined);
    expect(branchContext).toEqual(createBranchContext());
  });

  it('uses the origin current continuation when the main path is reordered', () => {
    const branchContext: MultiAnnotationBranchContext = {
      originAnnotationRefId: 'main-annotation',
      branchRootAnnotationRefId: 'branch-annotation',
    };
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        jest.fn(),
        createNavigateHotspot('200/reordered-annotation'),
        branchContext
      )
    );
    useSynchronousSetState(component);
    component.setState({ currentAnn: 'branch-annotation' });
    component.applyDiffAndGoToAnn = jest.fn();

    component.updateCurrentFlowMain('next');

    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation',
      '200/reordered-annotation'
    );
  });

  it('recovers branch context after loading a branch step directly', () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext()
    );
    props.toAnnotationId = 'branch-annotation';
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);
    component.applyDiffAndGoToAnn = jest.fn();

    component.updateCurrentFlowMain('next');

    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation',
      '200/next-annotation'
    );
  });

  it('recovers a cross-screen branch and rejoins after its final step', () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext(),
      { includeSecondBranchStep: true }
    );
    props.toAnnotationId = 'branch-annotation-2';
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);
    component.applyDiffAndGoToAnn = jest.fn();

    component.updateCurrentFlowMain('next');

    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation-2',
      '200/next-annotation'
    );
  });

  it('keeps context on another branch step and returns from the branch root', () => {
    const branchContext: MultiAnnotationBranchContext = {
      originAnnotationRefId: 'main-annotation',
      branchRootAnnotationRefId: 'branch-annotation',
    };
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        jest.fn(),
        createNavigateHotspot('200/next-annotation'),
        branchContext,
        { includeSecondBranchStep: true }
      )
    );
    useSynchronousSetState(component);
    component.applyDiffAndGoToAnn = jest.fn();

    component.updateMultiAnnotationBranchForDestination('branch-annotation-2');
    expect(branchContext.originAnnotationRefId).toBe('main-annotation');

    component.setState({ currentAnn: 'branch-annotation' });
    component.updateCurrentFlowMain('prev');
    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation',
      '100/main-annotation'
    );
  });

  it('skips hidden lead forms when inheriting the origin continuation', () => {
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        jest.fn(),
        createNavigateHotspot('200/next-annotation'),
        createBranchContext(),
        { includeLeadForm: true }
      )
    );
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();
    component.applyDiffAndGoToAnn = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');
    component.updateCurrentFlowMain('next');

    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation',
      '200/next-annotation'
    );
  });

  it('rejoins after a terminal lead form is skipped inside the branch', () => {
    const branchContext = createBranchContext();
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      branchContext,
      { includeBranchLeadForm: true }
    );
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();
    component.applyDiffAndGoToAnn = jest.fn();
    const branchLead = props.allAnnotationsForTour
      .flatMap(group => group.annotations)
      .find(ann => ann.refId === 'branch-lead-annotation')!;
    const effectiveNext = branchLead.buttons
      .find(btn => btn.type === 'next')!;

    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');
    component.updateJourneyProgress(branchLead.refId);
    const result = component.updateCurrentFlowMain(
      'next',
      undefined,
      effectiveNext
    );

    expect(result).toEqual({ handled: true });
    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation',
      '200/next-annotation'
    );
    expect(branchContext).toEqual(createBranchContext());
  });

  it('inherits an external link and reports the origin CTA', () => {
    const updateCurrentFlowMain = jest.fn();
    const branchContext = createBranchContext();
    const props = createBranchProps(
      updateCurrentFlowMain,
      createOpenHotspot('https://example.com'),
      branchContext
    );
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');
    const result = component.updateCurrentFlowMain('next');

    expect(result).toMatchObject({
      handled: true,
      ctaButton: { id: 'main-next' }
    });
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('next', undefined);
    expect(props.navigate).toHaveBeenCalledWith('https://example.com', 'abs', true);
    expect(branchContext).toEqual(createBranchContext());
  });

  it('maps branch progress to the origin step', () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext()
    );
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);

    component.updateJourneyProgress('branch-annotation');

    expect(props.updateJourneyProgress).toHaveBeenCalledWith('main-annotation');
  });

  it('does not treat a configured flow as an optional branch', () => {
    const updateCurrentFlowMain = jest.fn();
    const branchContext = createBranchContext();
    const props = createBranchProps(
      updateCurrentFlowMain,
      createNavigateHotspot('200/next-annotation'),
      branchContext
    );
    props.flows = [{ main: '100/branch-annotation' }] as unknown as IOwnProps['flows'];
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');

    expect(branchContext).toEqual(createBranchContext());
    expect(updateCurrentFlowMain).toHaveBeenCalledWith(
      'custom',
      '100/branch-annotation'
    );
  });

  it('clears branch context on a destination outside the branch', () => {
    const branchContext: MultiAnnotationBranchContext = {
      originAnnotationRefId: 'main-annotation',
      branchRootAnnotationRefId: 'branch-annotation',
    };
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        jest.fn(),
        createNavigateHotspot('200/next-annotation'),
        branchContext
      )
    );

    component.updateMultiAnnotationBranchForDestination('unrelated-annotation');

    expect(branchContext).toEqual(createBranchContext());
  });
});

describe('multi-annotation CTA classification', () => {
  const branchButton = { id: 'branch-next' } as IAnnotationButton;
  const originButton = { id: 'origin-next' } as IAnnotationButton;

  it('suppresses terminal CTA logging for an implicit branch rejoin', () => {
    expect(getCtaButtonForNavigation(branchButton, { handled: true })).toBeNull();
  });

  it('attributes an inherited external link to the origin CTA', () => {
    expect(getCtaButtonForNavigation(branchButton, {
      handled: true,
      ctaButton: originButton
    })).toBe(originButton);
  });

  it('keeps terminal CTA behavior when navigation is not handled', () => {
    expect(getCtaButtonForNavigation(branchButton)).toBe(branchButton);
  });
});
