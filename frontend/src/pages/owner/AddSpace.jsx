import { useNavigate } from 'react-router-dom'
import SpaceForm from '../../components/SpaceForm'
import { createSpace } from '../../services/spaceService'

export default function AddSpace() {
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
        onCancel={() => navigate('/owner/spaces')}
        onSubmit={async (data) => {
          await createSpace(data)
          navigate('/owner/spaces')
        }}
      />
    </>
  )
}
