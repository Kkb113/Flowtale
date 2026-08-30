import styled from 'styled-components';

export const ModalContainer = styled.div`
    position: fixed;
    top : 0;
    left : 0;
    width : 100vw;
    height : 100vh;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100000;
`;

export const Modal = styled.div`
    position: relative;
    width: 50%;
    padding: 2rem;
    background-color: white;
    border-radius: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap : 1rem;
    animation: popUp 200ms;
    
    .modal-content {
        width: 80%;
        display: flex;
        justify-content: space-evenly;
        align-items: center;
        gap: 1rem;
        .label {
            display: flex;
            gap: 1rem;
            margin: 1rem;
            width: 100%;
            align-items: center;
        }

        .rename-button {
            background-color: blue;
            color :white;
            font-weight: 600;
            border-radius: 0.25rem;
            border: none;
            outline: none;
            padding: 0.5rem;
            cursor: pointer;
        }
    }

    @keyframes popUp {
        0%{
            scale: 0.5;
        }

        50% {
            scale: 1.05;
        }

        100% {
            scale: 1;
        }
    }
    
`;

export const CloseButton = styled.div`
    position: absolute;
    top: 16px;
    right : 16px;
    cursor: pointer;
`;

export const RenameInput = styled.input`
    display: block;
    outline : 1px solid gray;
    border-radius : 0.5rem;
    border: none;
    padding: 0.5rem;
    font-size: 1.1rem;
    width: 80%;
`;
