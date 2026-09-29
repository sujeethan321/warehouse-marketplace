import { useNavigate } from 'react-router-dom'
import SpaceForm from '../../components/SpaceForm'
import { createSpace } from '../../services/spaceService'

const LIVE_API = { createSpace }

export default function AddSpace({ api = LIVE_API, basePath = '/owner' }) {
  const { createSpace } = api
  const navigate = useNavigate()
  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">New listing</div>
          <h1>Add storage space</h1>
        </div>
      </div>
      <SpaceForm
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
