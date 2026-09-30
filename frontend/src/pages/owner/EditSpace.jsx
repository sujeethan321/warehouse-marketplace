import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SpaceForm from '../../components/SpaceForm'
import { errMsg } from '../../services/api'
import { getSpace, updateSpace } from '../../services/spaceService'

const LIVE_API = { getSpace, updateSpace }

export default function EditSpace({ api = LIVE_API, basePath = '/owner' }) {
  const { getSpace, updateSpace } = api
  const { id } = useParams()
  const navigate = useNavigate()
  const [space, setSpace] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getSpace(id).then(setSpace).catch((e) => setError(errMsg(e)))
  }, [id, getSpace])

  if (error) return <div className="alert error">{error}</div>
  if (!space) return <div className="spinner" />

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">{space.unique_code}</div>
          <h1>Edit {space.name}</h1>
        </div>
      </div>
      <SpaceForm
        initial={space}
        currencyLabel="Rs"
        submitLabel="Save changes"
        onCancel={() => navigate(`${basePath}/spaces`)}
        onSubmit={async (data) => {
          await updateSpace(id, data)
          navigate(`${basePath}/spaces`)
        }}
      />
    </>
  )
}
