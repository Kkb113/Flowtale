import ScreenPreviewWithEditsAndAnnotationsReadonly, { IOwnProps } from './preview-with-edits-and-annotations-readonly';

jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

const createProps = (
  updateCurrentFlowMain: jest.Mock,
  flows: Array<{ main: string }>,
): IOwnProps => ({
  resizeSignal: 1,
  toAnnotationId: 'main-annotation',
  allAnnotationsForTour: [{
    screen: { id: 200 },
    annotations: [{
      refId: 'multi-annotation',
      buttons: [{ type: 'prev', hotspot: null }]
    }]
  }],
  flows,
  updateCurrentFlowMain
} as unknown as IOwnProps);

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

  it('updates the current flow when the selected annotation belongs to a flow', () => {
    const updateCurrentFlowMain = jest.fn();
    const component = new ScreenPreviewWithEditsAndAnnotationsReadonly(
      createProps(updateCurrentFlowMain, [{ main: '200/multi-annotation' }])
    );
    component.reachAnnotation = jest.fn();

    component.navigateToAnnByRefIdOnSameScreen('multi-annotation');

    expect(updateCurrentFlowMain).toHaveBeenCalledWith('custom', '200/multi-annotation');
  });
});
