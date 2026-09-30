import { useState } from 'react'
import { generateSpaceCode } from './ownerUtils'
import { useNavigate } from 'react-router-dom'
import SpaceForm from '../../components/SpaceForm'
import { createSpace } from '../../services/spaceService'

const LIVE_API = { createSpace }

export default function AddSpace({ api = LIVE_API, basePath = '/owner' }) {
  const { createSpace } = api
  const navigate = useNavigate()
  const [initial] = useState(() => ({ unique_code: generateSpaceCode() }))
  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">New listing</div>
          <h1>Add storage space</h1>
        </div>
      </div>
      <SpaceForm
        initial={initial}
        generatedCode
        currencyLabel="Rs"
        submitLabel="Publish listing"
        onCancel={() => navigate(`${basePath}/spaces`)}
        onSubmit={async (data) => {
          await createSpace(data)
          navigate(`${basePath}/spaces`)
        }}
      />
    </>
  )
}
