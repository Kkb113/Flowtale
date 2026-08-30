import { IAnnotationButton, ITourEntityHotspot } from '@fable/common/dist/types';
import { createLiteralProperty } from '@fable/common/dist/utils';
import React from 'react';
import {
  AnnotationCard,
  AnnotationCon,
  executeDeferredFlowNavigation,
  getCtaButtonForNavigation
} from '../annotation';
import { InternalEvents } from '../../types';
import {
  getAnnotationByRefId,
  getAnnotationSerialIdMap,
  updateGrpIdForTimelineTillEnd
} from '../annotation/ops';
import { Player } from '../../container/player';
import ScreenPreviewWithEditsAndAnnotationsReadonly, {
  IOwnProps,
  MultiAnnotationBranchContext
} from './preview-with-edits-and-annotations-readonly';

jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

const createBranchContext = (): MultiAnnotationBranchContext => ({
  frames: [],
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
  tourDataOpts: {
    main: '100/main-annotation',
    annotationFontFamily: createLiteralProperty(null)
  },
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
  includeNestedBranch?: boolean;
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
        zId: options.includeNestedBranch ? 'nested-shared-z-id' : 'branch-step-2-z-id',
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

    if (options.includeNestedBranch) {
      allAnnotationsForTour[allAnnotationsForTour.length - 1].annotations.push({
        refId: 'nested-branch-annotation',
        zId: 'nested-shared-z-id',
        buttons: [
          { id: 'nested-prev', type: 'prev', hotspot: null },
          { id: 'nested-next', type: 'next', hotspot: null }
        ]
      });
    }
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
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '');
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
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '100/main-annotation');
    expect(branchContext.frames).toEqual([
      {
        originAnnotationRefId: 'main-annotation',
        branchRootAnnotationRefId: 'branch-annotation'
      }
    ]);
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
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '100/main-annotation');
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

    expect(result).toMatchObject({
      handled: true,
      ctaButton: { id: 'main-next' }
    });
    expect(component.applyDiffAndGoToAnn).not.toHaveBeenCalled();
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('next', undefined);
    expect(branchContext).toEqual(createBranchContext());
  });

  it('uses the origin current continuation when the main path is reordered', () => {
    const branchContext: MultiAnnotationBranchContext = {
      frames: [{
        originAnnotationRefId: 'main-annotation',
        branchRootAnnotationRefId: 'branch-annotation',
      }]
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

  it('recovers a nested branch and rejoins the outer main path', () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext(),
      { includeSecondBranchStep: true, includeNestedBranch: true }
    );
    props.toAnnotationId = 'nested-branch-annotation';
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);
    component.applyDiffAndGoToAnn = jest.fn();

    const result = component.updateCurrentFlowMain('next');

    expect(result).toEqual({ handled: true });
    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledTimes(1);
    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'nested-branch-annotation',
      '200/next-annotation'
    );
  });

  it('returns from a nested branch to its immediate origin', () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext(),
      { includeSecondBranchStep: true, includeNestedBranch: true }
    );
    props.toAnnotationId = 'nested-branch-annotation';
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);
    component.applyDiffAndGoToAnn = jest.fn();

    const result = component.updateCurrentFlowMain('prev');

    expect(result).toEqual({ handled: true });
    expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
      'nested-branch-annotation',
      '300/branch-annotation-2'
    );
  });

  it('uses the connected origin for each branch when a nested group has several options', () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext(),
      { includeSecondBranchStep: true, includeNestedBranch: true }
    );
    const nestedScreen = props.allAnnotationsForTour.find(group => group.screen.id === 300)!;
    const connectedOrigin = nestedScreen.annotations.find(
      ann => ann.refId === 'branch-annotation-2'
    )!;
    const firstBranch = nestedScreen.annotations.find(
      ann => ann.refId === 'nested-branch-annotation'
    )!;
    const secondBranch = {
      ...firstBranch,
      refId: 'nested-branch-annotation-2',
      buttons: firstBranch.buttons.map(btn => ({
        ...btn,
        id: `${btn.id}-2`
      }))
    };
    nestedScreen.annotations = [
      firstBranch,
      secondBranch,
      connectedOrigin
    ];

    for (const branchRefId of ['nested-branch-annotation', 'nested-branch-annotation-2']) {
      const branchProps = {
        ...props,
        toAnnotationId: branchRefId,
        multiAnnotationBranchContext: createBranchContext()
      };
      const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(branchProps);
      component.applyDiffAndGoToAnn = jest.fn();

      component.updateCurrentFlowMain('prev');

      expect(component.applyDiffAndGoToAnn).toHaveBeenCalledWith(
        branchRefId,
        '300/branch-annotation-2'
      );
    }
  });

  it('maps nested branch progress to the outer configured step', () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext(),
      { includeSecondBranchStep: true, includeNestedBranch: true }
    );
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);

    component.updateJourneyProgress('nested-branch-annotation');

    expect(props.updateJourneyProgress).toHaveBeenCalledWith('main-annotation');
  });

  it('restores journey identity when a branch is loaded directly', () => {
    const updateCurrentFlowMain = jest.fn();
    const props = createBranchProps(
      updateCurrentFlowMain,
      createNavigateHotspot('200/next-annotation'),
      createBranchContext(),
      { includeSecondBranchStep: true }
    );
    props.flows = [{ main: '100/main-annotation' }] as unknown as IOwnProps['flows'];
    props.toAnnotationId = 'branch-annotation-2';
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);

    component.syncCurrentFlowIdentity('branch-annotation-2');

    expect(updateCurrentFlowMain).toHaveBeenCalledTimes(1);
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '100/main-annotation');
  });

  it('ignores a repeated branch advance while its transition is pending', () => {
    const updateCurrentFlowMain = jest.fn();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        updateCurrentFlowMain,
        createNavigateHotspot('200/next-annotation'),
        createBranchContext()
      )
    );
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();
    component.performDiffAndGoToAnn = jest.fn();
    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');

    const first = component.updateCurrentFlowMain('next');
    const second = component.updateCurrentFlowMain('next');

    expect(first).toEqual({ handled: true });
    expect(second).toEqual({ handled: true });
    expect(component.performDiffAndGoToAnn).toHaveBeenCalledTimes(1);
    expect(component.performDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation',
      '200/next-annotation'
    );
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '100/main-annotation');
  });

  it('completes a terminal branch only once on repeated input', () => {
    const updateCurrentFlowMain = jest.fn();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(updateCurrentFlowMain, null, createBranchContext())
    );
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();
    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');

    const first = component.updateCurrentFlowMain('next');
    const second = component.updateCurrentFlowMain('next');

    expect(first).toMatchObject({
      handled: true,
      ctaButton: { id: 'main-next' }
    });
    expect(second).toEqual({ handled: true });
    expect(updateCurrentFlowMain).toHaveBeenCalledTimes(2);
    expect(updateCurrentFlowMain).toHaveBeenNthCalledWith(1, 'custom', '100/main-annotation');
    expect(updateCurrentFlowMain).toHaveBeenNthCalledWith(2, 'next', undefined);
  });

  it('ignores repeated explicit navigation inside a branch', async () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext(),
      { includeSecondBranchStep: true }
    );
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);
    component.performDiffAndGoToAnn = jest.fn();

    await Promise.all([
      component.applyDiffAndGoToAnn('branch-annotation', '300/branch-annotation-2'),
      component.applyDiffAndGoToAnn('branch-annotation', '300/branch-annotation-2')
    ]);

    expect(component.performDiffAndGoToAnn).toHaveBeenCalledTimes(1);
    expect(component.performDiffAndGoToAnn).toHaveBeenCalledWith(
      'branch-annotation',
      '300/branch-annotation-2'
    );
  });

  it('releases the transition guard when the active route changes', async () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext()
    );
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(props);
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();
    component.performDiffAndGoToAnn = jest.fn();
    expect(component.beginBranchTransition()).toBe(true);
    const prevProps = component.props;
    const prevState = component.state;
    (component as unknown as { props: IOwnProps }).props = {
      ...props,
      toAnnotationId: 'next-annotation'
    };

    await component.componentDidUpdate(prevProps, prevState);
    await component.applyDiffAndGoToAnn('next-annotation', '100/main-annotation');

    expect(component.performDiffAndGoToAnn).toHaveBeenCalledTimes(1);
  });

  it('keeps context on another branch step and returns from the branch root', () => {
    const branchContext: MultiAnnotationBranchContext = {
      frames: [{
        originAnnotationRefId: 'main-annotation',
        branchRootAnnotationRefId: 'branch-annotation',
      }]
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

    component.syncMultiAnnotationBranchContext('branch-annotation-2');
    expect(branchContext.frames[0].originAnnotationRefId).toBe('main-annotation');

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

  it('stops safely when skipped lead forms contain a navigation cycle', () => {
    const updateCurrentFlowMain = jest.fn();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        updateCurrentFlowMain,
        createNavigateHotspot('150/lead-annotation'),
        createBranchContext(),
        { includeLeadForm: true }
      )
    );
    useSynchronousSetState(component);
    component.reachAnnotation = jest.fn();
    component.applyDiffAndGoToAnn = jest.fn();
    component.navigateToAnnByRefIdOnSameScreen('branch-annotation');

    const result = component.updateCurrentFlowMain('next');

    expect(result).toEqual({ handled: true });
    expect(component.applyDiffAndGoToAnn).not.toHaveBeenCalled();
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '100/main-annotation');
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
    expect(branchContext.frames[0].originAnnotationRefId).toBe('main-annotation');
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
    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '100/main-annotation');
    expect(result).toMatchObject({
      navigation: { url: 'https://example.com', openInSameTab: true }
    });
    expect(props.navigate).not.toHaveBeenCalled();
    result?.afterCta?.();
    expect(updateCurrentFlowMain).toHaveBeenNthCalledWith(1, 'custom', '100/main-annotation');
    expect(updateCurrentFlowMain).toHaveBeenNthCalledWith(2, 'next', undefined);
    expect(branchContext).toEqual(createBranchContext());
    expect(component.beginBranchTransition()).toBe(true);
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
      frames: [{
        originAnnotationRefId: 'main-annotation',
        branchRootAnnotationRefId: 'branch-annotation',
      }]
    };
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        jest.fn(),
        createNavigateHotspot('200/next-annotation'),
        branchContext
      )
    );

    component.syncMultiAnnotationBranchContext('unrelated-annotation');

    expect(branchContext).toEqual(createBranchContext());
  });

  it('reports a standalone destination for in-place analytics clearing', () => {
    const updateCurrentFlowMain = jest.fn();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createBranchProps(
        updateCurrentFlowMain,
        createNavigateHotspot('200/next-annotation'),
        createBranchContext()
      )
    );

    component.syncCurrentFlowIdentity('unrelated-annotation');

    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '');
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

  it('runs inherited CTA logging before flow completion and external navigation', () => {
    const order: string[] = [];
    const result = {
      handled: true,
      ctaButton: originButton,
      afterCta: () => order.push('flow-completion'),
      navigation: { url: 'https://example.com', openInSameTab: true }
    };
    const nav = jest.fn(() => order.push('navigation'));
    const ctaButton = getCtaButtonForNavigation(branchButton, result);

    if (ctaButton) order.push('cta');
    executeDeferredFlowNavigation(result, nav);

    expect(order).toEqual(['cta', 'flow-completion', 'navigation']);
    expect(nav).toHaveBeenCalledWith('https://example.com', 'abs', true);
  });

  it('suppresses rapid repeated external-link activation on the same annotation', () => {
    const nextButton = {
      id: 'open-next',
      type: 'next',
      text: createLiteralProperty('Open'),
      hotspot: createOpenHotspot('https://example.com')
    } as IAnnotationButton;
    const config = {
      refId: 'open-annotation',
      isHotspot: false,
      isLeadFormPresent: false,
      buttons: [nextButton]
    };
    const nav = jest.fn();
    const updateCurrentFlowMain = jest.fn();
    const updateJourneyProgress = jest.fn();
    const annotationCon = new AnnotationCon({
      data: [{
        el: document.body,
        hotspotEl: null,
        box: { top: 0, left: 0, width: 100, height: 100 },
        conf: {
          config,
          isMaximized: true,
          isElVisible: true,
          opts: {}
        },
        maskBox: null
      }],
      nav,
      win: window,
      playMode: true,
      tourId: 1,
      applyDiffAndGoToAnn: jest.fn(),
      updateCurrentFlowMain,
      updateJourneyProgress,
      navigateToAnnByRefIdOnSameScreen: jest.fn(),
      onCompMount: jest.fn(),
      isScreenHTML4: false,
      shouldSkipLeadForm: false,
      getNextAnnotation: jest.fn(),
      screenId: 100
    } as never);
    const rendered = annotationCon.render();
    const card = React.Children.toArray(rendered[0].props.children)
      .find(child => React.isValidElement(child) && child.type === AnnotationCard) as React.ReactElement<{
        navigateToAdjacentAnn: (type: 'next', btnId: string) => void;
      }>;
    let ctaCount = 0;
    const onCta = (): void => { ctaCount += 1; };
    document.addEventListener(InternalEvents.OnCtaClicked, onCta);

    try {
      card.props.navigateToAdjacentAnn('next', nextButton.id);
      card.props.navigateToAdjacentAnn('next', nextButton.id);
    } finally {
      document.removeEventListener(InternalEvents.OnCtaClicked, onCta);
    }

    expect(ctaCount).toBe(1);
    expect(updateJourneyProgress).toHaveBeenCalledTimes(1);
    expect(updateCurrentFlowMain).toHaveBeenCalledTimes(1);
    expect(nav).toHaveBeenCalledTimes(1);
    expect(nav).toHaveBeenCalledWith('https://example.com', 'abs', true);
  });
});

describe('Player flow lifecycle safety', () => {
  const createPlayerHarness = (
    journey: { flows: Array<{ main: string }> } | null,
    currentFlowMain = ''
  ): {
    player: Player;
    setState: jest.Mock;
    addJourneyToGlobalData: jest.Mock;
    navFn: jest.Mock;
  } => {
    const branchProps = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext()
    );
    const player = Object.create(Player.prototype) as Player;
    const setState = jest.fn();
    const addJourneyToGlobalData = jest.fn();
    const navFn = jest.fn();

    Object.defineProperties(player, {
      props: {
        value: {
          journey,
          allAnnotationsForTour: branchProps.allAnnotationsForTour,
          match: { params: { annotationId: 'main-annotation' } },
          tour: { rid: 'demo-rid' },
          isTourLoaded: true
        },
        writable: true
      },
      state: {
        value: {
          currentFlowMain,
          isInitialFlowMainResolved: false,
          isMinLoaderTimeDone: true,
          isIOSPhone: false,
          initiallyPrerenderedScreens: { screen: true }
        },
        writable: true
      },
      multiAnnotationBranchContext: {
        value: createBranchContext(),
        writable: true
      },
      isLoadingCompleteMsgSentRef: {
        value: { current: true },
        writable: true
      },
      setState: { value: setState, writable: true },
      addJourneyToGlobalData: { value: addJourneyToGlobalData, writable: true },
      isJourneyAdded: {
        value: () => Boolean(journey?.flows.length),
        writable: true
      },
      navFn: { value: navFn, writable: true }
    });

    return { player, setState, addJourneyToGlobalData, navFn };
  };

  it('does not dereference a missing journey while restoring a direct branch route', () => {
    const { player, setState } = createPlayerHarness(null);

    expect(() => player.setCurrentFlowMain('branch-annotation')).not.toThrow();
    expect(() => player.handleFlowNavigation('custom', '100/main-annotation')).not.toThrow();
    expect(setState).toHaveBeenCalledWith({
      currentFlowMain: '',
      isInitialFlowMainResolved: true
    });
  });

  it('preserves terminal completion for a demo without journey modules', () => {
    const { player } = createPlayerHarness(null);
    const postMessage = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});

    try {
      player.handleFlowNavigation('next');
      expect(postMessage).toHaveBeenCalledWith({
        type: 'lastAnnotation',
        demoRid: 'demo-rid'
      }, '*');
    } finally {
      postMessage.mockRestore();
    }
  });

  it('clears stale journey identity after navigating to a standalone annotation', () => {
    const main = '100/main-annotation';
    const { player, setState, addJourneyToGlobalData } = createPlayerHarness(
      { flows: [{ main }] },
      main
    );

    player.setCurrentFlowMain('unrelated-annotation');

    expect(addJourneyToGlobalData).toHaveBeenCalledWith('');
    expect(setState).toHaveBeenCalledWith({
      currentFlowMain: '',
      isInitialFlowMainResolved: true
    });
  });

  it('does not reactivate the initial loader after leaving configured journeys', () => {
    const main = '100/main-annotation';
    const { player } = createPlayerHarness({ flows: [{ main }] });
    Object.defineProperty(player, 'state', {
      value: {
        currentFlowMain: '',
        isInitialFlowMainResolved: true,
        isMinLoaderTimeDone: true,
        isIOSPhone: false,
        initiallyPrerenderedScreens: { screen: true }
      },
      writable: true
    });

    expect(player.isInitialPrerenderingComplete()).toBe(true);
  });

  it('keeps the loader active until a journey route can be resolved', () => {
    const main = '100/main-annotation';
    const { player, setState } = createPlayerHarness({ flows: [{ main }] });
    Object.defineProperty(player, 'props', {
      value: {
        ...player.props,
        match: { params: {} }
      },
      writable: true
    });

    player.setCurrentFlowMain();

    expect(setState).not.toHaveBeenCalled();
    expect(player.isInitialPrerenderingComplete()).toBe(false);
  });

  it('keeps ordinary next and previous journey-module navigation unchanged', () => {
    const firstMain = '100/main-annotation';
    const secondMain = '200/next-annotation';
    const { player, navFn } = createPlayerHarness(
      { flows: [{ main: firstMain }, { main: secondMain }] },
      firstMain
    );

    player.handleFlowNavigation('next');
    expect(navFn).toHaveBeenLastCalledWith(secondMain, 'annotation-hotspot');

    Object.defineProperty(player, 'state', {
      value: { currentFlowMain: secondMain },
      writable: true
    });
    player.handleFlowNavigation('prev');
    expect(navFn).toHaveBeenLastCalledWith(firstMain, 'annotation-hotspot');
  });
});

describe('annotation graph cycle safety', () => {
  it('builds a finite progress map for a configured cycle', () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext()
    );
    const nextAnnotation = getAnnotationByRefId(
      'next-annotation',
      props.allAnnotationsForTour
    )!;
    nextAnnotation.buttons.find(btn => btn.type === 'next')!.hotspot = createNavigateHotspot(
      '100/main-annotation'
    );
    const nextScreenGroup = props.allAnnotationsForTour.find(group => group.screen.id === 200)!;
    nextScreenGroup.annotations = nextScreenGroup.annotations.map(ann => (
      ann.refId === nextAnnotation.refId ? nextAnnotation : ann
    ));

    const [progress, nextStart] = getAnnotationSerialIdMap(
      '100/main-annotation',
      props.allAnnotationsForTour,
      {},
      0
    );

    expect(nextStart).toBe(2);
    expect(Object.keys(progress)).toEqual(['main-annotation', 'next-annotation']);
    expect(progress['main-annotation']).toMatchObject({ idx: 0, len: 2, absLen: 2 });
    expect(progress['next-annotation']).toMatchObject({ idx: 1, len: 2, absLen: 2 });
  });

  it('limits group propagation to one visit per annotation in a cycle', () => {
    const props = createBranchProps(
      jest.fn(),
      createNavigateHotspot('200/next-annotation'),
      createBranchContext()
    );
    const mainAnnotation = getAnnotationByRefId(
      'main-annotation',
      props.allAnnotationsForTour
    )!;
    const nextAnnotation = getAnnotationByRefId(
      'next-annotation',
      props.allAnnotationsForTour
    )!;
    nextAnnotation.buttons.find(btn => btn.type === 'next')!.hotspot = createNavigateHotspot(
      '100/main-annotation'
    );
    const nextScreenGroup = props.allAnnotationsForTour.find(group => group.screen.id === 200)!;
    nextScreenGroup.annotations = nextScreenGroup.annotations.map(ann => (
      ann.refId === nextAnnotation.refId ? nextAnnotation : ann
    ));

    const updates = updateGrpIdForTimelineTillEnd(
      mainAnnotation,
      props.allAnnotationsForTour,
      'new-group'
    );

    expect(updates.map(update => update.config.refId)).toEqual([
      'main-annotation',
      'next-annotation'
    ]);
  });
});
