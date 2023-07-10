/* eslint no-console:0 */
import Trigger from 'rc-trigger';
import React, { useRef } from 'react';
import '../../assets/index.less';

export default () => {
  const ref = useRef<HTMLElement>(null);
  console.log('cbl cbl',ref.current)
  return (
    <React.StrictMode>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body {
          overflow-x: hidden;
        }
      `,
        }}
      />

      <Trigger
        arrow={false}
        // forceRender
        // action="click"
        popupTransitionName='rc-trigger-popup-zoom'
        getTriggerDOMNode={(nd)=>{
          console.log('cbl getTriggerDOMNode',nd)
          if(ref.current){
            return ref.current
          }
        }}
        getMountRoot={()=>{
          return ref.current
        }}
        popup={
          <div
            style={{
              background: 'yellow',
              border: '1px solid blue',
              width: 200,
              height: 60,
              opacity: 0.9,
            }}
          >
          </div>
        }
        // popupVisible
        popupStyle={{ boxShadow: '0 0 5px red' }}
        popupAlign={{
          points: ['tl', 'tr'],
          overflow: {
            adjustX: true,
            adjustY: true,
          },
          htmlRegion: 'scroll',
        }}
      >
        <div style={{ width: '500px', height: '500px', background: 'red' }}>
         <span
           ref={ref}
           style={{
             background: 'green',
             color: '#FFF',
             paddingBlock: 30,
             paddingInline: 70,
             opacity: 0.9,
             transform: 'scale(0.6)',
             display: 'inline-block',
           }}
         >
          Target
        </span>
        </div>
      </Trigger>
    </React.StrictMode>
  );
};
