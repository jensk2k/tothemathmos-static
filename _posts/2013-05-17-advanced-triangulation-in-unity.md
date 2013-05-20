---
layout: blog_post
title: Advanced Triangulation in Unity
author: mathmos_
---
<p>The purpose of these script are for generating triangles for advanced 2D polygons. If you are just attempting to triangulating individual concave or convex polygons I recommend using this instead <a href="http://wiki.unity3d.com/index.php?title=Triangulator">Triangulator</a>, but if you need to triangulate something more advanced like polygons with holes or multiple polygons at once you probably need to use the following. </p>
<div class="imagebox">
    <img src="/images/blog/Polygon1.png" width="350px"/>
    <div class="caption">
    A PSLG containing multiple polygons and a hole.
    </div>
</div>
<div class="imagebox">
    <img src="/images/blog/Polygon3.png" width="350px"/>
    <div class="caption">
    The triangulated result.
    </div>
</div> 
<!--<div style="clear:both"></div>-->
<!-- more -->

<p>The way works is that you produce the polygon outline in the form of a planar straight line graph (a PSLG) using the PSLG class. This is passed to a program called <a href="http://www.cs.cmu.edu/~quake/triangle.html">Triangle</a>, which performs the actual triangulation. Download a compiled version for Windows <a href="/files/triangle.exe">here</a> and place it in the directory C:\Triangle\ .</p>

<h2>Usage</h2>
{% highlight c# %}
using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class TestTriangleAPI : MonoBehaviour {

    // Use this for initialization
    void Start () {
        if (gameObject.activeSelf)
        {
            List<Vector2> testVertices1 = new List<Vector2>(6);
            testVertices1.Add(new Vector2(1f, 0f));
            testVertices1.Add(new Vector2(0f, 6f));
            testVertices1.Add(new Vector2(3f, 5f));
            testVertices1.Add(new Vector2(4f, 7f));
            testVertices1.Add(new Vector2(6f, 6f));
            testVertices1.Add(new Vector2(6.5f, 2f));

            List<Vector2> testVertices2 = new List<Vector2>(3);
            testVertices2.Add(new Vector2(1.5f, 6.5f));
            testVertices2.Add(new Vector2(2.25f, 8f));
            testVertices2.Add(new Vector2(3.25f, 6.25f));

            List<Vector2> hole1 = new List<Vector2>(5);
            hole1.Add(new Vector2(3.5f, 3));
            hole1.Add(new Vector2(4.5f, 2.5f));
            hole1.Add(new Vector2(5.5f, 3.5f));
            hole1.Add(new Vector2(5f, 4f));
            hole1.Add(new Vector2(4f, 4f));

            PSLG testPSLG = new PSLG();
            testPSLG.AddVertexLoop(testVertices1);
            testPSLG.AddVertexLoop(testVertices2);
            testPSLG.AddHole(hole1);

            TriangleAPI triangle = new TriangleAPI();
            Polygon2D polygon = triangle.Triangulate(testPSLG);
            string tris = polygon.triangles.Length / 3 + ": ";
            foreach (int i in polygon.triangles)
            {
                tris += i + ", ";
            }
            
            string verts = polygon.vertices.Length + ": ";
            foreach (Vector2 i in polygon.vertices)
            {
                verts += i + ", ";
            }

            MeshBuilder builder = new MeshBuilder();

            for (int i = 0; i < polygon.triangles.Length; i += 3)
            {
                int[] indices = new int[] { polygon.triangles[i], polygon.triangles[i + 1], polygon.triangles[i + 2] };
                Vector3[] tri = new Vector3[] { polygon.vertices[indices[0]], polygon.vertices[indices[1]], polygon.vertices[indices[2]] };
                Vector3 normal = new Plane(tri[0], tri[1], tri[2]).normal;
                Vector3[] normals = new Vector3[] { normal, normal, normal };
                Vector2[] uvs = new Vector2[] { tri[0], tri[1], tri[2] };
                builder.AddTriangleToMesh(tri, normals, uvs);
            }

            Mesh mesh = builder.Build();

            gameObject.AddComponent<MeshFilter>().mesh = mesh;
            gameObject.AddComponent<MeshRenderer>().material = new Material(Shader.Find("Diffuse"));
        }
    }
}
{% endhighlight %}

Get the MeshBuilder class here <a href="/files/MeshBuilder.cs">MeshBuilder.cs</a>.

<h2>TriangleAPI.cs</h2>
{% highlight c# %}
using UnityEngine;
using System.Collections;
using System.IO;
using System.Collections.Generic;
using System;

public class TriangleAPI {

    // Use this for initialization
    public Polygon2D Triangulate(PSLG pslg)  {
        if (pslg.vertices.Count == 0)
        {
            Debug.LogError("No vertices passed to triangle. hole count: " + pslg.holes.Count + ", vert count: " + pslg.vertices.Count);
            return new Polygon2D(new int[] { }, new Vector2[] { });
        }
        else 
        {
            // Write poly file
            WritePolyFile(pslg);
        
            // Execute Triangle
            ExecuteTriangle();
        
            // Read outout
            Vector2[] vertices = ReadVerticesFile();
            int[] triangles = ReadTrianglesFile();
        
            CleanUp();

            return new Polygon2D(triangles, vertices);
        }
    }

    void WritePolyFile(PSLG pslg)
    {
        
            
        try
        {
            string polyFilePath = "C:\\triangle\\polygon.poly";
            if (File.Exists(polyFilePath))
            {
                File.Delete(polyFilePath);
            }

            using (StreamWriter sw = File.CreateText(polyFilePath))
            {
                sw.WriteLine("# polygon.poly");
                sw.WriteLine("# generated by Unity Triangle API");
                sw.WriteLine("#");
                // Vertices
                sw.WriteLine(pslg.GetNumberOfSegments() + " 2 0 1");
                sw.WriteLine("# The polyhedrons.");
                int boundaryMarker = 2;
                int i;
                for (i = 0; i < pslg.vertices.Count; i++)
                {
                    if (i != 0 && pslg.boundaryMarkersForPolygons.Contains(i))
                    {
                        boundaryMarker++;
                    }
                    sw.WriteLine(i + 1 + "\t" + pslg.vertices[i].x + "\t" + pslg.vertices[i].y + "\t" + boundaryMarker);
                }
                int offset = i;
                for (i = 0; i < pslg.holes.Count; i++)
                {
                    sw.WriteLine("# Hole #" + (i + 1));
                    int j;
                    for (j = 0; j < pslg.holes[i].vertices.Count; j++)
                    {
                        sw.WriteLine((offset + j + 1) + "\t" + pslg.holes[i].vertices[j].x + "\t" + pslg.holes[i].vertices[j].y + "\t" + (boundaryMarker + i + 1));
                    }
                    offset += j;
                }

                // Line segments
                sw.WriteLine();
                sw.WriteLine("# Line segments.");
                sw.WriteLine(pslg.GetNumberOfSegments() + " 1");
                sw.WriteLine("# The polyhedrons.");
                boundaryMarker = 2;
                for (i = 0; i < pslg.segments.Count; i++)
                {
                    if (i != 0 && pslg.boundaryMarkersForPolygons.Contains(i))
                    {
                        boundaryMarker++;
                    }
                    sw.WriteLine(i + 1 + "\t" + (pslg.segments[i][0] + 1) + "\t" + (pslg.segments[i][1] + 1) + "\t" + boundaryMarker);
                }
                offset = i;
                for (i = 0; i < pslg.holes.Count; i++)
                {
                    sw.WriteLine("# Hole #" + (i + 1));
                    int j;
                    for (j = 0; j < pslg.holes[i].segments.Count; j++)
                    {
                        sw.WriteLine((offset + j + 1) + "\t" + (offset + 1 + pslg.holes[i].segments[j][0]) + "\t" + (offset + 1 + pslg.holes[i].segments[j][1]) + "  " + (boundaryMarker + i + 1));
                    }
                    offset += j;
                }

                // Holes
                sw.WriteLine();
                sw.WriteLine("# Holes.");
                sw.WriteLine(pslg.holes.Count);
                for (i = 0; i < pslg.holes.Count; i++)
                {
                    Vector2 point = pslg.GetPointInHole(pslg.holes[i]);
                    sw.WriteLine((i + 1) + "\t" + point.x + "\t" + point.y + "\t # Hole #" + (i + 1));
                }
                sw.Close();
            }
        }
        catch (Exception e)
        {
            Debug.LogException(e);
        }
    }

    void ExecuteTriangle()
    {
        try
        {
            System.Diagnostics.Process process = new System.Diagnostics.Process();
            process.StartInfo.FileName = "C:\\triangle\\triangle.exe";
            process.StartInfo.Arguments = "-pPq0 C:\\triangle\\polygon.poly";
            process.StartInfo.RedirectStandardOutput = true;
            process.StartInfo.UseShellExecute = false;
            process.StartInfo.CreateNoWindow = true;
            process.Start();
            
            //string output = process.StandardOutput.ReadToEnd();
            //Debug.Log(output);
            
            process.WaitForExit();
        }
        catch (System.Exception e)
        {
            Debug.LogException(e);
        }
    }

    Vector2[] ReadVerticesFile()
    {
        Vector2[] vertices = null;
        try
        {
            string outputVerticesFile = "C:\\triangle\\polygon.1.node";

            StreamReader sr = File.OpenText(outputVerticesFile);

            string line = sr.ReadLine();
            int n = line.IndexOf("  ");
            int nVerts = int.Parse(line.Substring(0, n));
            vertices = new Vector2[nVerts];

            int whileCount = 0;

            while ((line = sr.ReadLine()) != null)
            {
                int index = -1;
                float x = 0f;
                float y = 0f;
                int c = 0;
                if (!line.Contains("#"))
                {
                    string[] stringBits = line.Split(' ');

                    foreach (string s in stringBits)
                    {
                        if (s != "" && s != " ")
                        {
                            if (c == 0)
                                index = int.Parse(s);
                            else if (c == 1)
                                x = float.Parse(s);
                            else if (c == 2)
                                y = float.Parse(s);

                            c++;
                        }
                    }
                }

                if (index != -1)
                {
                    vertices[index - 1] = new Vector2(x, y);
                }


                whileCount++;
                if (whileCount > 1000)
                {
                    Debug.LogError("Stuck in while loop");
                    break;
                }
            }

            sr.Close();
        }
        catch (Exception e)
        {
            Debug.LogException(e);
        }

        return vertices;
    }

    private int[] ReadTrianglesFile()
    {
        List<int> triList = null;
        try
        {
            string outputTrianglesFile = "C:\\triangle\\polygon.1.ele";

            using (StreamReader sr = File.OpenText(outputTrianglesFile))
            {

                string line = sr.ReadLine();
                int n = line.IndexOf("  ");
                int nTriangles = int.Parse(line.Substring(0, n));
                //int[] triangles = new int[nTriangles * 3];
                triList = new List<int>(nTriangles * 3);

                int count = 0;

                while ((line = sr.ReadLine()) != null)
                {
                    int index = -1;
                    int c = 0;
                    int[] tri = new int[3];
                    if (!line.Contains("#"))
                    {
                        string[] stringBits = line.Split(' ');

                        foreach (string s in stringBits)
                        {
                            if (s != "" && s != " ")
                            {
                                if (c == 0)
                                    index = int.Parse(s);
                                else if (c == 1)
                                    tri[0] = int.Parse(s) - 1;
                                else if (c == 2)
                                    tri[1] = int.Parse(s) - 1;
                                else if (c == 3)
                                    tri[2] = int.Parse(s) - 1;

                                c++;
                            }
                        }
                    }

                    if (index != -1)
                    {
                        triList.AddRange(tri);
                    }

                    count++;
                    if (count > 1000)
                    {
                        Debug.LogError("Stuck in while loop");
                        break;
                    }
                }

                sr.Close();
            }
        }
        catch (Exception e)
        {
            Debug.LogException(e);
        }

        return triList.ToArray();
    }

    private void CleanUp()
    {
        try
        {
            File.Delete("C:\\triangle\\polygon.1.ele");
            File.Delete("C:\\triangle\\polygon.1.node");
            File.Delete("C:\\triangle\\polygon.poly");
        }
        catch (Exception e)
        {
            Debug.LogException(e);
        }
    }
}

{% endhighlight %}

<h2>PSLG.cs</h2>
{% highlight c# %}
using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class PSLG {
    public List<Vector2> vertices;
    public List<int[]> segments;
    public List<PSLG> holes;
    public List<int> boundaryMarkersForPolygons;
    
    public PSLG()
    {
        vertices = new List<Vector2>();
        segments = new List<int[]>();
        holes = new List<PSLG>();
        boundaryMarkersForPolygons = new List<int>();
    }

    public PSLG(List<Vector2> vertices) : this()
    {
        this.AddVertexLoop(vertices);
    }
    
    public void AddVertexLoop(List<Vector2> vertices)
    {
        if (vertices.Count < 3)
        {
            Debug.Log("A vertex loop cannot have less than three vertices " + vertices.Count);
        }
        else
        {
            this.vertices.AddRange(vertices);
            int segmentOffset = segments.Count;
            boundaryMarkersForPolygons.Add(segments.Count);
            for(int i = 0; i < vertices.Count - 1; i++)
            {
                segments.Add(new int[] { i + segmentOffset, i + 1 + segmentOffset });
            }
            segments.Add(new int[] { vertices.Count - 1 + segmentOffset, segmentOffset });
        }
    }

    public void AddOrderedVertices(Vector2[] vertices)
    {
        AddVertexLoop(new List<Vector2>(vertices));
    }

    public void AddHole(List<Vector2> vertices)
    {
        PSLG hole = new PSLG();
        hole.AddVertexLoop(vertices);
        holes.Add(hole);
    }

    public void AddHole(Vector2[] vertices)
    {
        AddHole(new List<Vector2>(vertices));
    }

    public int GetNumberOfSegments()
    {
        int offset = vertices.Count;
        foreach (PSLG hole in holes)
        {
            offset += hole.segments.Count;
        }

        return offset;
    }

    public bool IsPointInPolygon(Vector2 point)
    {
        int j = segments.Count - 1;
        bool oddNodes = false;

        for (int i = 0; i < segments.Count; i++)
        {
            if ((vertices[i].y < point.y && vertices[j].y >= point.y
            || vertices[j].y < point.y && vertices[i].y >= point.y)
            && (vertices[i].x <= point.x || vertices[j].x <= point.x))
            {
                oddNodes ^= (vertices[i].x + (point.y - vertices[i].y) / (vertices[j].y - vertices[i].y) * (vertices[j].x - vertices[i].x) < point.x);
            }
            j = i;
        }

        return oddNodes;
    }

    public Vector2 GetPointInPolygon()
    {
        float topMost = vertices[0].y;
        float bottomMost = vertices[0].y;
        float leftMost = vertices[0].x;
        float rightMost = vertices[0].x;

        foreach (Vector2 vertex in vertices)
        {
            if (vertex.y > topMost)
                topMost = vertex.y;
            if (vertex.y < bottomMost)
                bottomMost = vertex.y;
            if (vertex.x < leftMost)
                leftMost = vertex.x;
            if (vertex.x > rightMost)
                leftMost = vertex.x;
        }
        
        Vector2 point;
        
        int whileCount = 0;
        do
        {
            point = new Vector2(Random.Range(leftMost, rightMost), Random.Range(bottomMost, topMost));
            whileCount++;
            if (whileCount > 10000)
            {
                string polygonstring = "";
                foreach(Vector2 vertex in vertices)
                {
                    polygonstring += vertex + ", "; 
                }
                Debug.LogError("Stuck in while loop. Vertices: " + polygonstring);
                break;
            }
        }
        while (!IsPointInPolygon(point));

        return point;
    }

    public Vector2 GetPointInHole(PSLG hole)
    {
        // 10 Get point in hole
        // 20 Is the point in a polygon that the hole is not in
        // 30 if so goto 10 else return
        List<PSLG> polygons = new List<PSLG>();
        for (int i = 0; i < boundaryMarkersForPolygons.Count; i++)
        {
            int startIndex = boundaryMarkersForPolygons[i];
            int endIndex = vertices.Count - 1;
            if (i < boundaryMarkersForPolygons.Count - 1)
                endIndex = boundaryMarkersForPolygons[i + 1] - 1;
            polygons.Add(new PSLG(vertices.GetRange(startIndex, endIndex - startIndex + 1)));
        }
        
        int whileCount = 0;

        Vector2 point;
        bool isPointGood;
        do 
        {
            
            isPointGood = true;
            point = hole.GetPointInPolygon();
            foreach (PSLG polygon in polygons)
            {
                string polygonVertices = "";
                foreach (Vector2 vertex in polygon.vertices)
                    polygonVertices += vertex + ",";

                if (polygon.IsPointInPolygon(hole.vertices[0]))
                {
                    // This polygon surrounds the hole, which is OK
                }
                else if (hole.IsPointInPolygon(polygon.vertices[0]))
                {
                    // This polygon is within the hole

                    if (polygon.IsPointInPolygon(point))
                    {
                        // The point is within a polygon that is inside the hole, which is NOT OK
                        isPointGood = false;
                    }
                    else
                    {
                        // But the point was not within this polygon
                    }
                }
                else
                {
                    // This polygon is far away from the hole
                }

            }
            whileCount++;
            if (whileCount > 10000)
            {
                string holestring = "";
                foreach(Vector2 vertex in hole.vertices)
                {
                    holestring += vertex + ", ";    
                }
                
                Debug.LogError("Stuck in while loop. Hole vertices: " + holestring);
                break;
            }
        }
        while (!isPointGood);

        return point;
    }
}
{% endhighlight %}

<h2>Polygon2D.cs</h2>
{% highlight c# %}
using UnityEngine;
using System.Collections;

public class Polygon2D {

    public int[] triangles;
    public Vector2[] vertices;

    public Polygon2D(int[] triangle, Vector2[] vertices)
    {
        this.triangles = triangle;
        this.vertices = vertices;
    }
}
{% endhighlight %}

<h2>Feedback</h2>
If you found this useful and/or if you have feedback, please let me know <a href="https://twitter.com/mathmos_">@mathmos_</a>.