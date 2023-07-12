import Portal from '@rc-component/portal';
import classNames from 'classnames';
import type { CSSMotionProps } from 'rc-motion';
import ResizeObserver from 'rc-resize-observer';
import { isDOM } from 'rc-util/lib/Dom/findDOMNode';
import useEvent from 'rc-util/lib/hooks/useEvent';
import useId from 'rc-util/lib/hooks/useId';
import useLayoutEffect from 'rc-util/lib/hooks/useLayoutEffect';
import * as React from 'react';
import type { TriggerContextProps } from './context';
import TriggerContext from './context';
import useAlign from './hooks/useAlign';
import useWatch from './hooks/useWatch';
import type {
  ActionType,
  AlignType,
  AnimationType,
  ArrowPos,
  ArrowTypeOuter,
  BuildInPlacements,
  TransitionNameType,
} from './interface';
import Popup from './Popup';
import TriggerWrapper from './TriggerWrapper';
import { getAlignPopupClassName, getMotion } from './util';
import { fillRef } from 'rc-util/lib/ref';
import { useEventListener } from '@byted/hooks';
import useWinClick from './hooks/useWinClick';
import { getShadowRoot } from 'rc-util/lib/Dom/shadow';

export type {
  BuildInPlacements,
  AlignType,
  ActionType,
  ArrowTypeOuter as ArrowType,
};

export interface TriggerRef {
  forceAlign: VoidFunction;
}

// Removed Props List
// Seems this can be auto
// getDocument?: (element?: HTMLElement) => Document;

// New version will not wrap popup with `rc-trigger-popup-content` when multiple children

export interface TriggerProps {
  children: React.ReactElement;
  action?: ActionType | ActionType[];

  prefixCls?: string;

  zIndex?: number;

  onPopupAlign?: (element: HTMLElement, align: AlignType) => void;

  stretch?: string;

  // ==================== Open =====================
  popupVisible?: boolean;
  defaultPopupVisible?: boolean;
  onPopupVisibleChange?: (visible: boolean) => void;
  afterPopupVisibleChange?: (visible: boolean) => void;

  // =================== Portal ====================
  getPopupContainer?: (node: HTMLElement) => HTMLElement;
  forceRender?: boolean;
  autoDestroy?: boolean;

  /** @deprecated Please use `autoDestroy` instead */
  destroyPopupOnHide?: boolean;

  // ==================== Mask =====================
  mask?: boolean;
  maskClosable?: boolean;

  // =================== Motion ====================
  /** Set popup motion. You can ref `rc-motion` for more info. */
  popupMotion?: CSSMotionProps;
  /** Set mask motion. You can ref `rc-motion` for more info. */
  maskMotion?: CSSMotionProps;

  /** @deprecated Please us `popupMotion` instead. */
  popupTransitionName?: TransitionNameType;
  /** @deprecated Please us `popupMotion` instead. */
  popupAnimation?: AnimationType;
  /** @deprecated Please us `maskMotion` instead. */
  maskTransitionName?: TransitionNameType;
  /** @deprecated Please us `maskMotion` instead. */
  maskAnimation?: AnimationType;

  // ==================== Delay ====================
  mouseEnterDelay?: number;
  mouseLeaveDelay?: number;

  focusDelay?: number;
  blurDelay?: number;

  // ==================== Popup ====================
  popup: React.ReactNode | (() => React.ReactNode);
  popupPlacement?: string;
  builtinPlacements?: BuildInPlacements;
  popupAlign?: AlignType;
  popupClassName?: string;
  popupStyle?: React.CSSProperties;
  getPopupClassNameFromAlign?: (align: AlignType) => string;
  onPopupClick?: React.MouseEventHandler<HTMLDivElement>;

  alignPoint?: boolean; // Maybe we can support user pass position in the future

  // ==================== Arrow ====================
  arrow?: boolean | ArrowTypeOuter;

  // ================= Deprecated ==================
  /** @deprecated Add `className` on `children`. Please add `className` directly instead. */
  className?: string;

  // =================== Private ===================
  /**
   * @private Get trigger DOM node.
   * Used for some component is function component which can not access by `findDOMNode`
   */
  getTriggerDOMNode?: (node: React.ReactInstance) => HTMLElement;

  getMountRoot?: () => HTMLElement | null;
  // // ========================== Mobile ==========================
  // /** @private Bump fixed position at bottom in mobile.
  //  * This is internal usage currently, do not use in your prod */
  // mobile?: MobileConfig;
}

export function generateTrigger(
  PortalComponent: React.ComponentType<any> = Portal,
) {
  const Trigger = React.forwardRef<TriggerRef, TriggerProps>((props, ref) => {
    const {
      prefixCls = 'rc-trigger-popup',
      children,


      // Open
      popupVisible,
      defaultPopupVisible,
      onPopupVisibleChange,
      afterPopupVisibleChange,

      // Delay
      mouseEnterDelay,
      mouseLeaveDelay = 0.1,

      // Mask
      mask,
      maskClosable = true,
      // Portal
      getPopupContainer,
      forceRender,
      autoDestroy,
      destroyPopupOnHide,

      // Popup
      popup,
      popupClassName,
      popupStyle,

      popupPlacement,
      builtinPlacements = {},
      popupAlign,
      zIndex,
      stretch,
      getPopupClassNameFromAlign,

      alignPoint,

      onPopupClick,
      onPopupAlign,

      // Arrow
      arrow,

      // Motion
      popupMotion,
      maskMotion,
      popupTransitionName,
      popupAnimation,
      maskTransitionName,
      maskAnimation,

      // Deprecated


      // Private
      getTriggerDOMNode,
      getMountRoot,
    } = props;


    const isInPopupRef = React.useRef(false);
    const mergedAutoDestroy = autoDestroy || destroyPopupOnHide || false;


    // ========================== Context ===========================
    const subPopupElements = React.useRef<Record<string, HTMLElement>>({});

    const parentContext = React.useContext(TriggerContext);
    const context = React.useMemo<TriggerContextProps>(() => {
      return {
        registerSubPopup: (id, subPopupEle) => {
          subPopupElements.current[id] = subPopupEle;

          parentContext?.registerSubPopup(id, subPopupEle);
        },
      };
    }, [parentContext]);

    // =========================== Popup ============================
    const id = useId();
    const [popupEle, setPopupEle] = React.useState<HTMLDivElement>(null);

    const setPopupRef = useEvent((node: HTMLDivElement) => {
      if (isDOM(node) && popupEle !== node) {
        setPopupEle(node);
      }

      parentContext?.registerSubPopup(id, node);
    });

    // =========================== Target ===========================
    // Use state to control here since `useRef` update not trigger render
    const [targetEle, setTargetEle] = React.useState<HTMLElement>(null);

    const setTargetRef = useEvent((node: HTMLElement) => {
      if (isDOM(node) && targetEle !== node) {
        setTargetEle(node);
      }
    });


    const triggerDom = React.useRef<HTMLElement | null>();

    fillRef(triggerDom, getMountRoot ? getMountRoot() : null);



    const inPopupOrChild = useEvent((ele: any) => {
      const childDOM = targetEle;

      return (
        childDOM?.contains(ele) ||
        getShadowRoot(childDOM)?.host === ele ||
        ele === childDOM ||
        popupEle?.contains(ele) ||
        getShadowRoot(popupEle)?.host === ele ||
        ele === popupEle ||
        Object.values(subPopupElements.current).some(
          (subPopupEle) => subPopupEle?.contains(ele) || ele === subPopupEle,
        )
      );
    });

    // =========================== Motion ===========================
    const mergePopupMotion = getMotion(
      prefixCls,
      popupMotion,
      popupAnimation,
      popupTransitionName,
    );

    const mergeMaskMotion = getMotion(
      prefixCls,
      maskMotion,
      maskAnimation,
      maskTransitionName,
    );

    // ============================ Open ============================
    const [internalOpen, setInternalOpen] = React.useState(
      defaultPopupVisible || false,
    );

    // Render still use props as first priority
    const mergedOpen = popupVisible ?? internalOpen;

    // We use effect sync here in case `popupVisible` back to `undefined`
    const setMergedOpen = useEvent((nextOpen: boolean) => {
      if (popupVisible === undefined) {
        setInternalOpen(nextOpen);
      }
    });

    useLayoutEffect(() => {
      setInternalOpen(popupVisible || false);
    }, [popupVisible]);

    const openRef = React.useRef(mergedOpen);
    openRef.current = mergedOpen;

    const internalTriggerOpen = useEvent((nextOpen: boolean) => {
      if (mergedOpen !== nextOpen) {
        setMergedOpen(nextOpen);
        onPopupVisibleChange?.(nextOpen);
      }
    });

    // Trigger for delay
    const delayRef = React.useRef<any>();

    const clearDelay = () => {
      clearTimeout(delayRef.current);
    };

    const triggerOpen = (nextOpen: boolean, delay = 0) => {
      clearDelay();
      if (delay === 0) {
        internalTriggerOpen(nextOpen);
      } else {
        delayRef.current = setTimeout(() => {
          internalTriggerOpen(nextOpen);
        }, delay * 1000);
      }
    };

    React.useEffect(() => clearDelay, []);

    // ========================== Motion ============================
    const [inMotion, setInMotion] = React.useState(false);

    useLayoutEffect((firstMount) => {
      if (!firstMount || mergedOpen) {
        setInMotion(true);
      }
    }, [mergedOpen]);

    const [motionPrepareResolve, setMotionPrepareResolve] =
      React.useState<VoidFunction>(null);

    // =========================== Align ============================


    const [
      ready,
      offsetX,
      offsetY,
      offsetR,
      offsetB,
      arrowX,
      arrowY,
      scaleX,
      scaleY,
      alignInfo,
      onAlign,
    ] = useAlign(
      mergedOpen,
      popupEle,
      targetEle,
      popupPlacement,
      builtinPlacements,
      popupAlign,
      onPopupAlign,
    );

    const triggerAlign = useEvent(() => {
      if (!inMotion) {
        onAlign();
      }
    });

    useWatch(mergedOpen, targetEle, popupEle, triggerAlign);

    useLayoutEffect(() => {
      triggerAlign();
    }, [popupPlacement]);

    // When no builtinPlacements and popupAlign changed
    useLayoutEffect(() => {
      if (mergedOpen && !builtinPlacements?.[popupPlacement]) {
        triggerAlign();
      }
    }, [JSON.stringify(popupAlign)]);

    const alignedClassName = React.useMemo(() => {
      const baseClassName = getAlignPopupClassName(
        builtinPlacements,
        prefixCls,
        alignInfo,
        alignPoint,
      );

      return classNames(baseClassName, getPopupClassNameFromAlign?.(alignInfo));
    }, [
      alignInfo,
      getPopupClassNameFromAlign,
      builtinPlacements,
      prefixCls,
      alignPoint,
    ]);

    React.useImperativeHandle(ref, () => ({
      forceAlign: triggerAlign,
    }));

    // ========================== Motion ============================
    const onVisibleChanged = (visible: boolean) => {
      setInMotion(false);
      onAlign();
      afterPopupVisibleChange?.(visible);
    };

    // We will trigger align when motion is in prepare
    const onPrepare = () =>
      new Promise<void>((resolve) => {
        setMotionPrepareResolve(() => resolve);
      });

    useLayoutEffect(() => {
      if (motionPrepareResolve) {
        onAlign();
        motionPrepareResolve();
        setMotionPrepareResolve(null);
      }
    }, [motionPrepareResolve]);

    // ========================== Stretch ===========================
    const [targetWidth, setTargetWidth] = React.useState(0);
    const [targetHeight, setTargetHeight] = React.useState(0);

    const onTargetResize = (_: object, ele: HTMLElement) => {
      triggerAlign();

      if (stretch) {
        const rect = ele.getBoundingClientRect();
        setTargetWidth(rect.width);
        setTargetHeight(rect.height);
      }
    };
    const clickToHide=false
    // Click to hide is special action since click popup element should not hide
    useWinClick(
      mergedOpen,
      clickToHide,
      targetEle,
      popupEle,
      mask,
      maskClosable,
      inPopupOrChild,
      triggerOpen,
    );

    const onPopupMouseEnter: VoidFunction = () => {
      isInPopupRef.current = true;
      triggerOpen(true, mouseEnterDelay);
    };
    const onPopupMouseLeave: VoidFunction = () => {
      isInPopupRef.current = false;
      triggerOpen(false, mouseLeaveDelay);
    };


    useEventListener('mouseenter', () => {
      triggerOpen(true, mouseEnterDelay);
    }, {
      target: triggerDom.current,
    });
    useEventListener('mouseleave', () => {
      if (!isInPopupRef.current) {
        triggerOpen(false, mouseLeaveDelay);
      }
    }, {
      target: triggerDom.current,
    });


    const arrowPos: ArrowPos = {
      x: arrowX,
      y: arrowY,
    };

    const innerArrow: ArrowTypeOuter = arrow
      ? {
        // true and Object likely
        ...(arrow !== true ? arrow : {}),
      }
      : null;
    // Render
    return (
      <>
        <ResizeObserver
          disabled={!mergedOpen}
          ref={setTargetRef}
          onResize={onTargetResize}
        >
          <TriggerWrapper getTriggerDOMNode={getTriggerDOMNode}>
            {children}
          </TriggerWrapper>
        </ResizeObserver>
        <TriggerContext.Provider value={context}>
          <Popup
            portal={PortalComponent}
            ref={setPopupRef}
            prefixCls={prefixCls}
            popup={popup}
            className={classNames(popupClassName, alignedClassName)}
            style={popupStyle}
            target={targetEle}
            onMouseEnter={onPopupMouseEnter}
            onMouseLeave={onPopupMouseLeave}
            zIndex={zIndex}
            // Open
            open={mergedOpen}
            keepDom={inMotion}
            // Click
            onClick={onPopupClick}
            // Mask
            mask={mask}
            // Motion
            motion={mergePopupMotion}
            maskMotion={mergeMaskMotion}
            onVisibleChanged={onVisibleChanged}
            onPrepare={onPrepare}
            // Portal
            forceRender={forceRender}
            autoDestroy={mergedAutoDestroy}
            getPopupContainer={getPopupContainer}
            // Arrow
            align={alignInfo}
            arrow={innerArrow}
            arrowPos={arrowPos}
            // Align
            ready={ready}
            offsetX={offsetX}
            offsetY={offsetY}
            offsetR={offsetR}
            offsetB={offsetB}
            onAlign={triggerAlign}
            // Stretch
            stretch={stretch}
            targetWidth={targetWidth / scaleX}
            targetHeight={targetHeight / scaleY}
          />
        </TriggerContext.Provider>
      </>
    );
  });

  if (process.env.NODE_ENV !== 'production') {
    Trigger.displayName = 'Trigger';
  }

  return Trigger;
}

export default generateTrigger(Portal);
