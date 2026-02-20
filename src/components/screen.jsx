function Screen({ children }) {
    return (
        <div className='page w-full h-screen overflow-y-auto justify-items-center flex flex-col bg-[#030712]'>
            {children}
        </div>
    )
}

export default Screen