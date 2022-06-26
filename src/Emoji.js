import React, { useRef, useState, useEffect } from "react";
import Picker, { SKIN_TONE_MEDIUM_DARK } from 'emoji-picker-react';

function Emoji(props) {
    const [show, setShow] = useState(false)
    const openEmoji = () => {
        setShow(!show)
    }
    return (
        <>
            <i onClick={openEmoji} className="fa fa-meh-o" aria-hidden="true"></i>
            {show && (<div className="card mehBox">
                <Picker
                    onEmojiClick={(event, emojiObject) => {
                        setShow(!show)
                        props.enableTxt(emojiObject)
                    }}
                    disableAutoFocus={true}
                    skinTone={SKIN_TONE_MEDIUM_DARK}
                    groupNames={{ smileys_people: 'PEOPLE' }}
                    native
                />
            </div>)}
        </>
    )
}
export default Emoji