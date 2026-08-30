export const EXT_INFO_SHADOW_HOST_CON_ID = "f-ext-info-host-con";

export const EXT_INFO_MODAL_INNERHTML = `
<style>
  :host { all: initial }
  
  h1,
  p {
    margin: 0;
    padding: 0;
  }
  .full-screen-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: calc(Infinity);
    background: rgb(33 33 33 / 60%);
  }
  .info-con {
    font-family: sans-serif;
    position: fixed;
    top: 16px;
    right: 24px;
    color: white;
    padding: 0.25rem;
    border-radius: 4px;
    z-index: calc(Infinity);
  }
  
  .content-con {
    padding: 1rem;
  }
  
  h1 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
  }
  
  p {
    font-size: 0.75rem;
    margin-top: 16px;
  }

  .jmp-icn {
    position: relative;
    width: 40px;
    height: 40px;
    margin-left: 12px;
    display: inline-block;
    animation: bounce 2s infinite;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 70% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(30px);
    }
    60% {
      transform: translateY(15px);
    }
  }

  .head-con {
    display: flex;
    justify-content: space-between;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
  }

  .overlay {
    position: fixed;
    height: 50%;
    width: 60%;
    right: -25%;
    top: -25%;
    border-radius: 50%;
    background: linear-gradient(to right, #fedf64 0%, #FE64D0 27%, #6483FE 50%) right;
    filter: saturate(0.7);
    cursor: pointer;
  }
  </style>
  
  <div class="full-screen-modal">
  <div class="overlay"></div>
  <div class="info-con">
    <div class="content-con">
      <div class="head-con">
        <div>
            <div>Click Fable's extension icon again</div>
            <div>to stop/delete the recording</div>
        </div>
          <div class='jmp-icn'>↑↑</div>
      </div>
      <p>
        This message will be auto dismissed in 5 seconds.
        <br/>
        Click anywhere to dismiss the message.
      </p>
    </div>
  </div>
  </div>
  </div>
`;
