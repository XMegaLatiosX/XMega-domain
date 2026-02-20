import hard_video from "../assets/videos/=).mp4"

function Notfound() {
    return (
        <div className="m-0  w-full h-full overflow-hidden" onClick={() => {document.getElementById("video").muted = false}}>
            <video src={hard_video} muted autoPlay loop className="bg-video fixed inset-0 w-screen h-screen object-fill -z-10 blur-lg brightness-75"></video>
            <video id="video" src={hard_video} muted autoPlay loop className="main-video w-[99vw] h-[99vh]"></video>
        </div>
    )
}
export default Notfound