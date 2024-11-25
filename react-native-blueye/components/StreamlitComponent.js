import React from 'react';

const StreamlitComponent = () => {
    return (
        <iframe
            src="http://localhost:8501/"
            width="100%"
            height="800"
            style={{ border: "none" }}
            title="Streamlit Embed"
        ></iframe>
    );
};

export default StreamlitComponent;
