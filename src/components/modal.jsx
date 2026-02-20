import { useNavigate, useParams } from "react-router-dom"
import medias from "/src/data/medias.json"


function Modal() {
    const { category, media_name } = useParams()
    const navigate = useNavigate()

    
    function change_modal(side) {
            const index = medias.findIndex(media => media.name === media_name)
            if(!medias[index + side] || medias[index + side].category != category) return // future animation not sliding
            navigate(`/gallery/${category}/${medias[index + side].name}`)
    }

    const current_post = medias.find(media => (media.name == media_name));
    const components = {
        "mp4": <video id="modal_video" className="max-h-[60vh]" src={current_post.path} autoPlay loop onClick={() => {
            document.getElementById('modal_video').paused ? document.getElementById('modal_video').play() : document.getElementById('modal_video').pause()
        }}
        >
            {/* <button onClick={() => { VOL, TIME AND ETC 
            }}></button> */}
            </video>,
        "png": <img id="modal_img" className="max-h-[60vh]" src={current_post.path} />
    }

    return (
        <div className="fixed bottom-1/6 w-screen h-[calc(100vh-7rem)] overflow-auto flex justify-around items-center mb-8" id="modal_bg">
            <div className="fixed w-full h-screen" onClick={() => navigate(`/gallery/${category}`)}></div>
            <div  className="fixed z-50 flex flex-col items-center justify-center max-w-[90%]" id="modal_div">
                <div className="relative flex items-center justify-center grow">
                    <a onClick={() => change_modal(-1)} className="fixed z-30 rounded-full bg-[rgba(53,31,61,0.75)] w-12 h-12 left-2 sm:left-2/12 flex justify-center  pl-2 items-center"><i className="arrow select-none w-6 h-6 rotate-135"></i></a>
                    {components[current_post.path.split('.')[1]]}
                    <a onClick={() => change_modal(1)} className="fixed z-30 rounded-full bg-[rgba(0,0,0,.5)] w-12 h-12 right-2 sm:right-2/12 flex justify-center  pr-2 items-center"><i className="arrow select-none w-6 h-6 -rotate-45"></i></a>
                </div>
                <h2>{media_name}</h2>
            </div>

        </div>
    )
}
export default Modal