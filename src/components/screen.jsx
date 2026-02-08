function Screen({ children }) {
    return (
        <div className='page w-full h-screen overflow-y-auto justify-items-center flex flex-col'>
            {children}
        </div>
    )
}

export default Screen