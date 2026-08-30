import { SerNode } from '@fable/common/dist/types';
import { DeSerProps } from '../../preview';

export type AddDiff = {
    addedNode: SerNode,
    nextFid: string,
    textNode: SerNode | null,
    props: DeSerProps,
}

export type DelDiff = {
    fid: string,
    isTextComment: boolean,
}

export type UpdateDiff = {
    fid: string,
    updates: Update[],
}

export type Update = {
    attrKey: string,
    attrOldVal: string,
    attrNewVal: string,
    shouldRemove: boolean,
}

export type CommonNode = {
    serNodeOfTree1: SerNode,
    serNodeOfTree2: SerNode,
}

export type ReplaceDiff = {
    fid: string,
    serNode: SerNode,
    props: DeSerProps,
}

export type DiffsSerNode = {
    addedNodes: AddDiff[],
    deletedNodes: DelDiff[],
    updatedNodes: UpdateDiff[],
    commonNodes: CommonNode[],
    replaceNodes: ReplaceDiff[],
    shouldReplaceNode: boolean,
    nodeProps: DeSerProps,
}

export type QueueNode = {
    serNodeOfTree1: SerNode,
    node1: HTMLElement | ShadowRoot,
    serNodeOfTree2: SerNode,
    props: DeSerProps,
}
