export const COUNTDOWN_SHADOW_HOST_CON_ID = "f-cd-con";
export const COUNTDOWN_NUM_ID = "f-cd-num";
export const COUNTDOWN_FIRST_LINE_ID = "f-cd-line-1";
export const COUNTDOWN_SECOND_LINE_ID = "f-cd-line-2";
export const COUNTDOWN_SKIP_ID = "f-cd-skip";

export const COUNTDOWN_INNERHTML = `
<style>
:host { all: initial }
  
div,
button {
  font-family: sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

p {
  margin: 0;
}

.cd-modal {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  z-index: calc(Infinity);
  background: rgba(43, 43, 43, 0.9);
}

.cd-center-con {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
  color: white;
}

.cd-circle {
  background: linear-gradient(to bottom right, #3831ac, #623da2);
  box-shadow: rgba(209, 213, 219, 0.2) 0px 7px 29px 0px;
  height: 9rem;
  width: 9rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
}

.cd-num {
  font-size: 6rem;
  font-weight: bold;
  text-align: center;
  margin-top: 0.5rem;
}

.skip-cd {
  font-size: 0.75rem;
  background: none;
  border: none;
  margin-bottom: 0.5rem;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
}

.skip-cd:hover {
  text-decoration: underline dotted;
}

.cd-line {
  margin-top: 1rem;
  font-size: 24px;
  font-weight: bold;
}

.cd-line.first {
  margin-top: 2rem;
}

.hide {
  visibility: hidden;
}
</style>
<div class="cd-modal">
<div class="cd-center-con">
  <div class="cd-circle">
    <div id="${COUNTDOWN_NUM_ID}" class="cd-num">5</div>
    <button type="button" id="${COUNTDOWN_SKIP_ID}" class="skip-cd">
      Skip
    </button>
  </div>
  <p class="cd-line first" id="${COUNTDOWN_FIRST_LINE_ID}">
    Fable's continuous capture will record full HTML of your screen.
  </p>
  <p class="cd-line second hide" id="${COUNTDOWN_SECOND_LINE_ID}">
    You can now click through your product to create your demo.
  </p>
</div>
</div>
`;
